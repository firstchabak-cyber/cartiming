import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzePrice } from "@/lib/gemini/client";
import {
  analysisSchema,
  buildAnalysisPrompt,
  deriveLoanContext,
  extractJson,
  type VehicleForPrompt,
  type MaintenanceRecord,
} from "@/lib/analysis/prompt";
import {
  getMonthlyAnalysisCount,
  spendCredits,
} from "@/lib/credits/server";
import { CREDIT_COSTS, FREE_ANALYSIS_PER_MONTH } from "@/lib/credits/constants";
import {
  formatSimilarSalesForPrompt,
  getSimilarSales,
} from "@/lib/analysis/similarSales";
import {
  formatExternalQuotesForPrompt,
  getCrowdQuoteStats,
  getOwnVehicleQuotes,
} from "@/lib/analysis/externalQuotes";
import { classifyPlate } from "@/lib/analysis/prompt";
import {
  logAnalysis,
  maybeAlertAdminOnErrorBurst,
} from "@/lib/observability/analysis-log";

const requestSchema = z.object({
  vehicleId: z.string().uuid(),
  force: z.boolean().optional(),
});

const CACHE_TTL_HOURS = 24;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "vehicleId가 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, displacement_cc, body_type, vehicle_class, options, damage_map, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity, status, loan_principal, loan_started_at, loan_months, loan_apr",
    )
    .eq("id", parsed.data.vehicleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  if ((vehicle as { status?: string }).status === "sold") {
    return NextResponse.json(
      { error: "매각 완료된 차량은 분석할 수 없습니다" },
      { status: 400 },
    );
  }

  const { data: maintenance } = await supabase
    .from("vehicle_maintenance")
    .select("category, part, description, performed_at, cost")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", user.id)
    .order("performed_at", { ascending: false })
    .limit(30);

  const records: MaintenanceRecord[] = maintenance ?? [];
  const ctx = deriveLoanContext(vehicle as VehicleForPrompt);

  // 캐시 검사: force=false이고 24h 이내 분석이 있으면 재사용 (Gemini 호출 X)
  if (!parsed.data.force) {
    const cutoff = new Date(
      Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const { data: cached } = await supabase
      .from("price_analyses")
      .select(
        "current_price, current_price_min, current_price_max, predicted_1m, predicted_3m, predicted_6m, predicted_1y, predicted_2y, predicted_3y, signal, rationale, generated_at",
      )
      .eq("vehicle_id", vehicle.id)
      .eq("user_id", user.id)
      .gte("generated_at", cutoff)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const sims = await getSimilarSales({
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
      });
      void logAnalysis({
        userId: user.id,
        vehicleId: vehicle.id,
        outcome: "cache_hit",
        currentPrice: cached.current_price,
        signal: cached.signal,
        snapshot: {
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
        },
      });
      return NextResponse.json({
        vehicle_id: vehicle.id,
        current_price: cached.current_price,
        current_price_min: cached.current_price_min,
        current_price_max: cached.current_price_max,
        predicted_1m: cached.predicted_1m,
        predicted_3m: cached.predicted_3m,
        predicted_6m: cached.predicted_6m,
        predicted_1y: cached.predicted_1y,
        predicted_2y: cached.predicted_2y,
        predicted_3y: cached.predicted_3y,
        signal: cached.signal,
        rationale: cached.rationale,
        generated_at: cached.generated_at,
        cached: true,
        similar_sales: sims,
        loan: ctx.loan
          ? {
              principal: ctx.loan.principal,
              monthly_payment: ctx.monthly,
              balances: ctx.balances,
            }
          : null,
      });
    }
  }

  // 무료 5회 초과 여부만 먼저 판단 (차감은 분석 성공 후)
  const usedThisMonth = await getMonthlyAnalysisCount(user.id);
  const isFreeAnalysis = usedThisMonth < FREE_ANALYSIS_PER_MONTH;

  // 유료 사용자는 잔액 사전 확인 — 부족하면 호출조차 안 함
  if (!isFreeAnalysis) {
    const { data: credits } = await supabase
      .from("user_credits")
      .select("balance, lifetime_member")
      .eq("user_id", user.id)
      .maybeSingle();
    const hasEnough =
      credits?.lifetime_member ||
      (credits?.balance ?? 0) >= CREDIT_COSTS.analysisOverage;
    if (!hasEnough) {
      void logAnalysis({
        userId: user.id,
        vehicleId: vehicle.id,
        outcome: "insufficient_credits",
        snapshot: {
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
        },
      });
      return NextResponse.json(
        {
          error: `이번 달 무료 분석 ${FREE_ANALYSIS_PER_MONTH}회를 모두 사용했습니다. 추가 분석은 ${CREDIT_COSTS.analysisOverage} 캐시가 필요해요.`,
          code: "insufficient_credits",
          required: CREDIT_COSTS.analysisOverage,
        },
        { status: 402 },
      );
    }
  }

  const [similarSales, ownQuotes, crowdStats] = await Promise.all([
    getSimilarSales({
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      year: vehicle.year,
    }),
    getOwnVehicleQuotes(vehicle.id, user.id),
    getCrowdQuoteStats({
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      year: vehicle.year,
    }),
  ]);

  const plateInfo = classifyPlate(
    (vehicle as { plate_number?: string | null }).plate_number,
  );
  const ownPlateCategory =
    plateInfo.category === "unknown" ? null : plateInfo.category;
  const similarSalesText = formatSimilarSalesForPrompt(
    similarSales,
    ownPlateCategory,
  );
  const externalQuotesText = formatExternalQuotesForPrompt({
    ownQuotes,
    crowdStats,
  });

  const prompt = buildAnalysisPrompt({
    vehicle: vehicle as VehicleForPrompt,
    maintenance: records,
    ctx,
    similarSalesText,
    externalQuotesText,
  });

  const startedAt = Date.now();
  let raw: string;
  try {
    raw = await analyzePrice(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const isOverload =
      msg.includes("503") ||
      msg.toLowerCase().includes("overload") ||
      msg.toLowerCase().includes("high demand") ||
      msg.toLowerCase().includes("unavailable");
    // 로깅 + 운영자 알림 트리거
    void logAnalysis({
      userId: user.id,
      vehicleId: vehicle.id,
      outcome: isOverload ? "overload" : "error",
      durationMs: Date.now() - startedAt,
      errorMessage: msg,
      snapshot: {
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
      },
    });
    void maybeAlertAdminOnErrorBurst();
    // 호출 실패 — 캐시는 아직 차감 안 했으므로 환불 불필요
    return NextResponse.json(
      {
        error: isOverload
          ? "AI 서비스가 일시적으로 혼잡합니다. 1~2분 후 다시 시도해 주세요."
          : "AI 분석 호출에 실패했습니다",
        detail: msg,
        retryable: isOverload,
      },
      { status: isOverload ? 503 : 502 },
    );
  }

  // 분석 호출 성공 후에만 캐시 차감
  if (!isFreeAnalysis) {
    const spend = await spendCredits({
      amount: CREDIT_COSTS.analysisOverage,
      type: "analysis_overage",
      description: `시세 분석 추가 (${usedThisMonth + 1}회차)`,
      refId: vehicle.id,
    });
    if (!spend.ok) {
      // 사전 잔액 검사 통과했는데 차감 실패 — race condition.
      // 분석 결과는 이미 받았으니 그대로 반환하되 로그만 남김.
      console.error(
        "캐시 차감 실패 (분석은 성공)",
        spend.reason,
        spend.message,
        user.id,
      );
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    void logAnalysis({
      userId: user.id,
      vehicleId: vehicle.id,
      outcome: "validation_error",
      durationMs: Date.now() - startedAt,
      errorMessage: "JSON 파싱 실패",
      snapshot: {
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
      },
    });
    return NextResponse.json(
      { error: "AI 응답을 해석하지 못했습니다", raw },
      { status: 502 },
    );
  }

  const analysisParsed = analysisSchema.safeParse(json);
  if (!analysisParsed.success) {
    void logAnalysis({
      userId: user.id,
      vehicleId: vehicle.id,
      outcome: "validation_error",
      durationMs: Date.now() - startedAt,
      errorMessage: "스키마 검증 실패",
      snapshot: {
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
      },
    });
    return NextResponse.json(
      {
        error: "AI 응답 형식이 올바르지 않습니다",
        issues: analysisParsed.error.flatten().fieldErrors,
        raw,
      },
      { status: 502 },
    );
  }

  const analysis = analysisParsed.data;
  const { data: saved } = await supabase
    .from("price_analyses")
    .insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      current_price: analysis.current_price,
      current_price_min: analysis.current_price_min ?? null,
      current_price_max: analysis.current_price_max ?? null,
      predicted_1m: analysis.predicted_1m,
      predicted_3m: analysis.predicted_3m,
      predicted_6m: analysis.predicted_6m,
      predicted_1y: analysis.predicted_1y,
      predicted_2y: analysis.predicted_2y,
      predicted_3y: analysis.predicted_3y,
      signal: analysis.signal,
      rationale: analysis.rationale,
    })
    .select("id, generated_at")
    .single();

  if (analysis.signal === "sell_now") {
    await supabase.from("notifications").insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      type: "sell_now",
      title: `${vehicle.manufacturer} ${vehicle.model} 매각 적기`,
      message: `현재 시세 ${analysis.current_price.toLocaleString("ko-KR")}원. ${analysis.rationale}`,
    });
  }

  void logAnalysis({
    userId: user.id,
    vehicleId: vehicle.id,
    outcome: "success",
    durationMs: Date.now() - startedAt,
    currentPrice: analysis.current_price,
    signal: analysis.signal,
    snapshot: {
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      year: vehicle.year,
    },
  });

  return NextResponse.json({
    vehicle_id: vehicle.id,
    ...analysis,
    generated_at: saved?.generated_at ?? new Date().toISOString(),
    cached: false,
    similar_sales: similarSales,
    loan: ctx.loan
      ? {
          principal: ctx.loan.principal,
          monthly_payment: ctx.monthly,
          balances: ctx.balances,
        }
      : null,
  });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  if (!vehicleId) {
    return NextResponse.json(
      { error: "vehicleId가 필요합니다" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("price_analyses")
    .select(
      "vehicle_id, current_price, predicted_1m, predicted_3m, predicted_6m, predicted_1y, predicted_2y, predicted_3y, signal, rationale, generated_at",
    )
    .eq("vehicle_id", vehicleId)
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analysis: data });
}
