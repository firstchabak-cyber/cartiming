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
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, displacement_cc, body_type, vehicle_class, options, damage_map, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity, loan_principal, loan_started_at, loan_months, loan_apr",
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
        "current_price, predicted_1m, predicted_3m, predicted_6m, predicted_1y, predicted_2y, predicted_3y, signal, rationale, generated_at",
      )
      .eq("vehicle_id", vehicle.id)
      .eq("user_id", user.id)
      .gte("generated_at", cutoff)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        vehicle_id: vehicle.id,
        current_price: cached.current_price,
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

  const prompt = buildAnalysisPrompt({
    vehicle: vehicle as VehicleForPrompt,
    maintenance: records,
    ctx,
  });

  let raw: string;
  try {
    raw = await analyzePrice(prompt);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI 분석 호출에 실패했습니다",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    return NextResponse.json(
      { error: "AI 응답을 해석하지 못했습니다", raw },
      { status: 502 },
    );
  }

  const analysisParsed = analysisSchema.safeParse(json);
  if (!analysisParsed.success) {
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

  return NextResponse.json({
    vehicle_id: vehicle.id,
    ...analysis,
    generated_at: saved?.generated_at ?? new Date().toISOString(),
    cached: false,
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
