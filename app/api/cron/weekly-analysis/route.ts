import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { analyzePrice } from "@/lib/gemini/client";
import {
  analysisSchema,
  buildAnalysisPrompt,
  deriveLoanContext,
  extractJson,
  type AnalysisSnapshot,
  type MaintenanceRecord,
  type VehicleForPrompt,
} from "@/lib/analysis/prompt";
import { computeInputHash } from "@/lib/analysis/fingerprint";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PRICE_CHANGE_THRESHOLD = 0.05; // 5% 이상 변동 시 알림
const PER_VEHICLE_DELAY_MS = 800; // Gemini RPM 한도 회피용 간격

type VehicleRow = VehicleForPrompt & {
  id: string;
  user_id: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function analyzeOne(
  admin: ReturnType<typeof createAdminClient>,
  vehicle: VehicleRow,
): Promise<{ status: "ok" | "skip" | "error"; reason?: string }> {
  const { data: maintenance } = await admin
    .from("vehicle_maintenance")
    .select("category, part, description, performed_at, cost")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", vehicle.user_id)
    .order("performed_at", { ascending: false })
    .limit(30);

  const records: MaintenanceRecord[] = maintenance ?? [];
  const ctx = deriveLoanContext(vehicle);
  const prompt = buildAnalysisPrompt({ vehicle, maintenance: records, ctx });

  let raw: string;
  try {
    raw = await analyzePrice(prompt);
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : "gemini_failed",
    };
  }

  let parsed: AnalysisSnapshot;
  try {
    const json = JSON.parse(extractJson(raw));
    const result = analysisSchema.safeParse(json);
    if (!result.success) {
      return {
        status: "error",
        reason: `parse: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
      };
    }
    parsed = result.data;
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : "parse_failed",
    };
  }

  // 이전 분석과 비교해서 알림 트리거 판단
  const { data: previous } = await admin
    .from("price_analyses")
    .select("current_price, signal")
    .eq("vehicle_id", vehicle.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("price_analyses").insert({
    vehicle_id: vehicle.id,
    user_id: vehicle.user_id,
    current_price: parsed.current_price,
    predicted_1m: parsed.predicted_1m,
    predicted_3m: parsed.predicted_3m,
    predicted_6m: parsed.predicted_6m,
    predicted_1y: parsed.predicted_1y,
    predicted_2y: parsed.predicted_2y,
    predicted_3y: parsed.predicted_3y,
    signal: parsed.signal,
    rationale: parsed.rationale,
    input_hash: computeInputHash(vehicle, records),
  });

  // 같은 차종 여러 대를 구분할 수 있도록 차량번호를 앞에 표기
  const plate = (vehicle as { plate_number?: string | null }).plate_number;
  const carLabel = `${plate ? `[${plate}] ` : ""}${vehicle.manufacturer} ${vehicle.model}`;
  const notifications: Array<{
    type: "sell_now" | "price_drop" | "price_rise";
    title: string;
    message: string;
  }> = [];

  // sell_now 신호 전환 (이전 분석이 없거나 sell_now 아니었을 때만)
  if (
    parsed.signal === "sell_now" &&
    (!previous || previous.signal !== "sell_now")
  ) {
    notifications.push({
      type: "sell_now",
      title: `${carLabel} 매각 적기 신호`,
      message: `업자 매입가 ${parsed.current_price.toLocaleString("ko-KR")}원. 시세 분석에서 매각 권고가 떴습니다.`,
    });
  }

  // 시세 5% 이상 변동
  if (previous && previous.current_price > 0) {
    const diff = parsed.current_price - previous.current_price;
    const ratio = Math.abs(diff) / previous.current_price;
    if (ratio >= PRICE_CHANGE_THRESHOLD) {
      const pct = Math.round(ratio * 1000) / 10;
      if (diff < 0) {
        notifications.push({
          type: "price_drop",
          title: `${carLabel} 시세 ${pct}% 하락`,
          message: `${previous.current_price.toLocaleString("ko-KR")} → ${parsed.current_price.toLocaleString("ko-KR")}원 (업자 매입가 기준)`,
        });
      } else {
        notifications.push({
          type: "price_rise",
          title: `${carLabel} 시세 ${pct}% 상승`,
          message: `${previous.current_price.toLocaleString("ko-KR")} → ${parsed.current_price.toLocaleString("ko-KR")}원 (업자 매입가 기준)`,
        });
      }
    }
  }

  // 인앱 알림 + 이메일(수신 동의한 사용자에게만) 발송.
  // createAndDispatch 가 인앱 insert 와 이메일을 함께 처리한다.
  // (자동 분석 알림 — 매각적기/시세변동 — 은 모두 중요하므로 email: true)
  for (const n of notifications) {
    await createAndDispatch(admin, {
      userId: vehicle.user_id,
      vehicleId: vehicle.id,
      type: n.type,
      title: n.title,
      message: n.message,
      email: true,
    });
  }

  return { status: "ok" };
}

export async function GET(request: Request) {
  // Vercel Cron 인증: Authorization: Bearer <CRON_SECRET>
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET 환경변수가 설정되지 않았습니다" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 자동 매각 감시는 '알림(이메일 알림)을 켠' 유료 사용자만 받는다.
  // 무료 사용자는 직접 분석만 — 자동분석/자동알림 대상에서 제외(가치 차별화 + AI 비용 절감).
  const { data: optedRows } = await admin
    .from("user_credits")
    .select("user_id")
    .eq("email_notifications", true);
  const optedIds = ((optedRows as Array<{ user_id: string }>) ?? []).map(
    (r) => r.user_id,
  );
  if (optedIds.length === 0) {
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      total: 0,
      succeeded: 0,
      failed: 0,
      note: "자동 감시를 켠 사용자가 없습니다",
    });
  }

  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select(
      "id, user_id, manufacturer, model, trim, year, mileage, purchase_price, msrp, fuel_type, transmission, displacement_cc, body_type, vehicle_class, options, damage_map, wheel_scuff_count, key_count, damage_note, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity, loan_principal, loan_started_at, loan_months, loan_apr",
    )
    .eq("status", "active")
    .in("user_id", optedIds);

  if (error) {
    return NextResponse.json(
      { error: "차량 목록 조회 실패", detail: error.message },
      { status: 500 },
    );
  }

  const rows = (vehicles ?? []) as VehicleRow[];
  const summary = {
    total: rows.length,
    ok: 0,
    errors: [] as Array<{ vehicleId: string; reason: string }>,
  };

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i];
    try {
      const result = await analyzeOne(admin, v);
      if (result.status === "ok") summary.ok++;
      else
        summary.errors.push({
          vehicleId: v.id,
          reason: result.reason ?? "unknown",
        });
    } catch (err) {
      summary.errors.push({
        vehicleId: v.id,
        reason: err instanceof Error ? err.message : "thrown",
      });
    }
    if (i < rows.length - 1) await sleep(PER_VEHICLE_DELAY_MS);
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    total: summary.total,
    succeeded: summary.ok,
    failed: summary.errors.length,
    errors: summary.errors,
  });
}
