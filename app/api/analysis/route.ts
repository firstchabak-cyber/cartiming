import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzePrice } from "@/lib/gemini/client";
import {
  loanBalanceTimeline,
  monthlyPayment,
  type LoanInfo,
} from "@/lib/utils/loan";

const requestSchema = z.object({
  vehicleId: z.string().uuid(),
  force: z.boolean().optional(),
});

const CACHE_TTL_HOURS = 24;

const analysisSchema = z.object({
  current_price: z.number().nonnegative(),
  predicted_1m: z.number().nonnegative(),
  predicted_3m: z.number().nonnegative(),
  predicted_6m: z.number().nonnegative(),
  predicted_1y: z.number().nonnegative(),
  predicted_2y: z.number().nonnegative(),
  predicted_3y: z.number().nonnegative(),
  signal: z.enum(["sell_now", "review", "hold"]),
  rationale: z.string().min(1),
});

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) return fence[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return text;
}

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
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, displacement_cc, body_type, vehicle_class, options, loan_principal, loan_started_at, loan_months, loan_apr",
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

  const records = maintenance ?? [];
  const accidentCount = records.filter((r) => r.category === "사고").length;
  const repairCount = records.filter((r) =>
    ["판금", "교환", "수리"].includes(r.category),
  ).length;

  const maintenanceLines =
    records.length === 0
      ? "- (등록된 이력 없음)"
      : records
          .map((r) => {
            const cost = r.cost != null ? ` · ${r.cost.toLocaleString("ko-KR")}원` : "";
            const desc = r.description ? ` (${r.description})` : "";
            return `- ${r.performed_at} [${r.category}] ${r.part}${desc}${cost}`;
          })
          .join("\n");

  const loan: LoanInfo | null =
    vehicle.loan_principal != null &&
    vehicle.loan_started_at &&
    vehicle.loan_months != null &&
    vehicle.loan_apr != null
      ? {
          principal: vehicle.loan_principal,
          startedAt: vehicle.loan_started_at,
          months: vehicle.loan_months,
          apr: vehicle.loan_apr,
        }
      : null;

  const referenceDate = new Date().toISOString().slice(0, 10);
  const balances = loan ? loanBalanceTimeline(loan, referenceDate) : null;
  const monthly = loan ? Math.round(monthlyPayment(loan)) : null;

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
        loan: loan
          ? {
              principal: loan.principal,
              monthly_payment: monthly,
              balances,
            }
          : null,
      });
    }
  }

  const loanSection = loan
    ? `대출 정보 (원리금 균등상환):
- 원금: ${loan.principal.toLocaleString("ko-KR")}원
- 실행일: ${loan.startedAt}
- 기간: ${loan.months}개월
- 연 금리: ${loan.apr}%
- 월납 추정: ${monthly?.toLocaleString("ko-KR")}원
- 시점별 잔액(원): 현재 ${balances!.now.toLocaleString("ko-KR")} · 1개월 ${balances!.after_1m.toLocaleString("ko-KR")} · 3개월 ${balances!.after_3m.toLocaleString("ko-KR")} · 6개월 ${balances!.after_6m.toLocaleString("ko-KR")} · 1년 ${balances!.after_1y.toLocaleString("ko-KR")} · 2년 ${balances!.after_2y.toLocaleString("ko-KR")} · 3년 ${balances!.after_3y.toLocaleString("ko-KR")}

대출 반영 가이드:
- 매각 시 순수령액 = 시세 − 그 시점 잔액. 순수령액이 음수이면 추가 자금 투입이 필요해 매각이 곤란합니다.
- 순수령액이 단기에는 음수지만 1년 안에 양수로 전환되면 signal은 'hold'(완납 시점까지 보유 권장).
- 단기 순수령액 > 장기 순수령액이 명확하면 'sell_now'.
- rationale에 "순수령액"과 "잔액 완납 시점"을 구체 숫자로 언급할 것.
`
    : `대출 정보: 없음 (모든 시세가 곧 순수령액)
`;

  const optionList =
    vehicle.options && vehicle.options.length > 0
      ? vehicle.options.join(", ")
      : "정보 없음";

  const prompt = `대한민국 중고차 시장에서 아래 차량의 **업자 매입가 (딜러가 매수자로부터 매입하는 시점의 도매가)** 를 분석해 주세요.

가격 기준 원칙 (중요):
- 모든 가격(current_price 및 predicted_*)은 **업자 매입가** 기준입니다.
- 일반인이 보는 엔카/KB차차차 등의 중고차 소매 시세보다 통상 10~15% 낮은 금액으로 추정하세요.
- rationale 에서 이 가격이 "업자 매입가" 임을 명시해 주세요.


차량 정보:
- 제조사: ${vehicle.manufacturer}
- 모델: ${vehicle.model}
- 트림: ${vehicle.trim ?? "정보 없음"}
- 연식: ${vehicle.year}년
- 주행거리: ${vehicle.mileage} km
- 연료: ${vehicle.fuel_type ?? "정보 없음"}
- 변속기: ${vehicle.transmission ?? "정보 없음"}
- 배기량: ${vehicle.displacement_cc ? `${vehicle.displacement_cc} cc` : "정보 없음"}
- 차체 형상: ${vehicle.body_type ?? "정보 없음"}
- 차종: ${vehicle.vehicle_class ?? "정보 없음"}
- 추가 옵션: ${optionList}

정비/사고 이력 (총 ${records.length}건, 사고 ${accidentCount}건 / 판금·교환·수리 ${repairCount}건):
${maintenanceLines}

${loanSection}

옵션 반영 가이드:
- 파노라마 선루프, 가죽시트(나파), 통풍시트, 헤드업 디스플레이, 어댑티브 크루즈, 어라운드뷰 등 상위 옵션은 동급 대비 가산 요인입니다(통상 +1~5%).
- 배기량과 차체형상은 동일 모델 내에서도 시세를 크게 가르는 변수입니다. SUV/하이브리드/전기는 일반적으로 감가율이 낮은 편.

이력 반영 가이드:
- 사고 이력(특히 판금/교환을 동반한 사고)은 시세를 크게 낮추는 요인입니다. 무사고 동급 대비 통상 5~25% 감가.
- 외판 교환·판금 이력은 사고에 준해 감가 요인. 단, 단순 흠집/도색은 영향 적음.
- **예외 — 감가 미반영 부위**: 앞범퍼·뒷범퍼·휠은 교환/판금/수리되어도 시세 감가에 반영하지 않습니다. 국내 중고차 시장 통념상 소모성 외판으로 간주됩니다.
- 정기 정비(엔진오일, 브레이크 등) 이력이 충실하면 관리상태가 좋다는 신호 → 감가 폭 일부 보정.
- 파손 후 수리되지 않은 상태(예: 사고 이력은 있지만 같은 부위에 수리 카테고리 기록이 없는 경우)는 매각 시 매수자 측 추정 수리비가 추가 감가됩니다. rationale에 명시할 것.
- 이력이 비어있으면 일반적 동급 시세를 추정.

다음 JSON 스키마로만 응답해 주세요. 설명, 주석, 마크다운 코드펜스 없이 JSON 객체만 출력합니다.
{
  "current_price": <원 단위 현재 시세 정수>,
  "predicted_1m": <1개월 후 예상 시세 정수>,
  "predicted_3m": <3개월 후 예상 시세 정수>,
  "predicted_6m": <6개월 후 예상 시세 정수>,
  "predicted_1y": <1년 후 예상 시세 정수>,
  "predicted_2y": <2년 후 예상 시세 정수>,
  "predicted_3y": <3년 후 예상 시세 정수>,
  "signal": "sell_now" | "review" | "hold",
  "rationale": "판단 근거를 한국어 2~3문장. 사고/정비 이력이 시세에 미친 영향이 있으면 명시"
}

장기 예측 가이드:
- 국산 중형 세단 기준 연간 감가율은 통상 1년차 약 12~15%, 2년차 8~10%, 3년차 6~8% 수준이며, 수입차/인기 모델/전기차는 다를 수 있습니다.
- 주행거리 누적(연 2만 km 가정)도 함께 반영.
- 모델 단종/페이스리프트/세대교체 일정이 있으면 가속 감가.

signal 기준:
- sell_now: 현재가가 향후 12개월 이내 예상가보다 명확히 높을 때
- review: 단기는 안정적이나 장기(1~3년) 전망이 크게 떨어질 때
- hold: 가까운 미래에 인상 요인이 있거나 시세가 단단할 때`;

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
    loan: loan
      ? {
          principal: loan.principal,
          monthly_payment: monthly,
          balances,
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
