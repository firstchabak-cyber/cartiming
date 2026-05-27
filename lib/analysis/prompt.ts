import { z } from "zod";
import {
  loanBalanceTimeline,
  monthlyPayment,
  type LoanInfo,
} from "@/lib/utils/loan";

export type VehicleForPrompt = {
  manufacturer: string;
  model: string;
  trim: string | null;
  year: number;
  mileage: number;
  fuel_type: string | null;
  transmission: string | null;
  displacement_cc: number | null;
  body_type: string | null;
  vehicle_class: string | null;
  options: string[] | null;
  damage_map: Record<string, string> | null;
  // 추가 식별/감가 영향 필드
  plate_number: string | null;
  color: string | null;
  interior_color: string | null;
  registered_at: string | null;
  vin: string | null;
  engine_code: string | null;
  seating_capacity: number | null;
  loan_principal: number | null;
  loan_started_at: string | null;
  loan_months: number | null;
  loan_apr: number | null;
};

// 한국 번호판 한글 분류 (영업용 판별)
// 렌터카: 하·호·허 — 일반적으로 시세 -25~35% 감가
// 영업용/택시·배달: 바·사·아·자·배 — 시세 -35~50% 감가
const RENTAL_PLATE_CHARS = ["하", "호", "허"];
const COMMERCIAL_PLATE_CHARS = ["바", "사", "아", "자", "배"];

export function classifyPlate(plate: string | null | undefined): {
  category: "rental" | "commercial" | "private" | "unknown";
  hangul: string | null;
} {
  if (!plate) return { category: "unknown", hangul: null };
  const normalized = plate.replace(/\s+/g, "");
  // 번호판에서 한글 1글자 추출 (예: "12가3456" → "가", "123하4567" → "하")
  const match = normalized.match(/[가-힣]/);
  const hangul = match?.[0] ?? null;
  if (!hangul) return { category: "unknown", hangul: null };
  if (RENTAL_PLATE_CHARS.includes(hangul))
    return { category: "rental", hangul };
  if (COMMERCIAL_PLATE_CHARS.includes(hangul))
    return { category: "commercial", hangul };
  return { category: "private", hangul };
}

export type MaintenanceRecord = {
  category: string;
  part: string;
  description: string | null;
  performed_at: string;
  cost: number | null;
};

export type AnalysisSnapshot = {
  current_price: number;
  predicted_1m: number;
  predicted_3m: number;
  predicted_6m: number;
  predicted_1y: number;
  predicted_2y: number;
  predicted_3y: number;
  signal: "sell_now" | "review" | "hold";
  rationale: string;
};

export type PromptContext = {
  loan: LoanInfo | null;
  monthly: number | null;
  balances: ReturnType<typeof loanBalanceTimeline> | null;
};

const NON_DEPRECIATING_PARTS = new Set([
  "앞범퍼",
  "뒷범퍼",
  "휠(좌앞)",
  "휠(우앞)",
  "휠(좌뒤)",
  "휠(우뒤)",
]);

export const analysisSchema = z.object({
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

export function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) return fence[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return text;
}

export function deriveLoanContext(
  vehicle: VehicleForPrompt,
  referenceDate: string = new Date().toISOString().slice(0, 10),
): PromptContext {
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

  const balances = loan ? loanBalanceTimeline(loan, referenceDate) : null;
  const monthly = loan ? Math.round(monthlyPayment(loan)) : null;
  return { loan, balances, monthly };
}

export function buildAnalysisPrompt(args: {
  vehicle: VehicleForPrompt;
  maintenance: MaintenanceRecord[];
  ctx: PromptContext;
}): string {
  const { vehicle, maintenance, ctx } = args;
  const { loan, balances, monthly } = ctx;

  const accidentCount = maintenance.filter((r) => r.category === "사고").length;
  const repairCount = maintenance.filter((r) =>
    ["판금", "교환", "수리"].includes(r.category),
  ).length;

  const maintenanceLines =
    maintenance.length === 0
      ? "- (등록된 이력 없음)"
      : maintenance
          .map((r) => {
            const cost =
              r.cost != null ? ` · ${r.cost.toLocaleString("ko-KR")}원` : "";
            const desc = r.description ? ` (${r.description})` : "";
            return `- ${r.performed_at} [${r.category}] ${r.part}${desc}${cost}`;
          })
          .join("\n");

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

  const damageMap =
    vehicle.damage_map && typeof vehicle.damage_map === "object"
      ? vehicle.damage_map
      : {};
  const damageEntries = Object.entries(damageMap).filter(
    ([, s]) => s && s !== "없음",
  );
  const countedDamage = damageEntries.filter(
    ([part]) => !NON_DEPRECIATING_PARTS.has(part),
  );
  const ignoredDamage = damageEntries.filter(([part]) =>
    NON_DEPRECIATING_PARTS.has(part),
  );
  const damageSection =
    damageEntries.length === 0
      ? "외판 상태: 전부 이상 없음 (무사고·무판금)"
      : [
          countedDamage.length > 0
            ? `외판 상태 (감가 반영):\n${countedDamage
                .map(([p, s]) => `- ${p}: ${s}`)
                .join("\n")}`
            : "외판 상태 (감가 반영): 없음",
          ignoredDamage.length > 0
            ? `\n외판 상태 (감가 미반영 — 앞/뒤 범퍼·휠):\n${ignoredDamage
                .map(([p, s]) => `- ${p}: ${s}`)
                .join("\n")}`
            : "",
        ].join("\n");

  const plateInfo = classifyPlate(vehicle.plate_number);
  const plateLine = (() => {
    if (!vehicle.plate_number) return "- 번호판: 정보 없음";
    if (plateInfo.category === "rental")
      return `- 번호판: ${vehicle.plate_number} ⚠️ **렌터카 출신** (한글 "${plateInfo.hangul}") — 시세 통상 -5~7% 감가 (주행거리/사고이력만큼 큰 요인은 아님)`;
    if (plateInfo.category === "commercial")
      return `- 번호판: ${vehicle.plate_number} ⚠️ **영업용·택시·배달 출신** (한글 "${plateInfo.hangul}") — 시세 통상 -15~30% 감가`;
    if (plateInfo.category === "private")
      return `- 번호판: ${vehicle.plate_number} (자가용 한글 "${plateInfo.hangul}")`;
    return `- 번호판: ${vehicle.plate_number}`;
  })();

  return `당신은 대한민국 중고차 시장 전문가입니다. 아래 차량의 **업자 매입가** (딜러가 차주로부터 매입하는 시점의 도매 가격) 를 추정하고 매각 의사결정 가이드를 만들어 주세요.

[가격 기준 — 절대 원칙]
- current_price 와 predicted_* 모든 숫자는 **업자 매입가 기준** 입니다.
- 엔카·KB차차차 등 소매 광고가에서 **반드시 10~15% 차감** 한 도매 가격으로 산정하세요.
- 소매가를 그대로 쓰면 안 됩니다. 반드시 업자 매입가로 환산할 것.

[감가 요인 우선순위 — 핵심 원칙]
국내 중고차 시장에서 감가에 가장 큰 영향을 주는 요인 순서:
1순위. **주행거리** — 연 1.5~2만 km 기준선 대비 +/-. 과주행은 시세에 큰 폭으로 반영.
2순위. **사고/판금/교환 이력** — 부위·범위에 따라 -1~25% 누적 감가.
3순위. **차령** — **반드시 "최초 등록일" 기준** 으로 계산. 연식(model year)이 아닙니다.
   - 예: 2022년식이지만 재고차로 2023-08-15 에 최초 등록되었으면 차령은 2023-08-15 기준 (오늘 - 2023-08-15).
   - 출고 직후 등록(연식과 등록일이 같은 해)이면 일반적 감가 곡선 그대로.
   - 재고차로 늦게 등록된 경우 (1년 이상 지연) 차령 측면에서는 유리하지만 "재고차 출신" 인식으로 약간의 시장 페널티 가능.
4순위. 번호판 영업용 여부 — 보조 요인 (아래).

[번호판 분류 — 보조 감가 요인 (1·2순위 대비 비중 작음)]
- 렌터카 번호판 (하·호·허): 자가용 동급 대비 **-5~7%** 감가. 렌터카는 주행거리는 많아도 정기 점검을 받았기에 큰 폭 감가는 아님. 단, 같은 주행거리/연식의 자가용보다는 항상 낮은 가격.
- 영업용 번호판 (바·사·아·자·배): 자가용 동급 대비 **-15~30%** 감가. 택시·배달 등 가혹한 운행 환경 + 다수 운전자 이력.
- 자가용 번호판 (기타 한글): 감가 없음.
- 번호판 영업용 감가는 위 1·2순위(주행거리, 사고이력)의 감가와 **별도로 누적** 적용합니다 (중복 계산 X).

[대출 반영 — 차주의 매각 의사결정 기준]
${loan ? "- 대출 잔액이 있는 차량입니다. 시점별 잔액과 대조해서 매각 손익을 명확히 판단해야 합니다." : "- 대출 없음. 시세가 곧 차주 수령액입니다."}
- 차주 입장에서 의미 있는 숫자는 "업자 매입가 − 그 시점 대출잔액 = 차주 순수령액" 입니다.
- 순수령액이 단기에 음수지만 1년 안에 양수 전환 → hold, 단기 순수령액이 장기보다 명확히 높음 → sell_now, 단순히 시세 하락이 가팔라지면 → review.


차량 정보 (입력된 모든 값을 시세 산정에 반영하세요):
- 제조사: ${vehicle.manufacturer}
- 모델: ${vehicle.model}
- 트림: ${vehicle.trim ?? "정보 없음"} (트림에 따른 옵션·등급 차이를 반영)
- 연식 (모델 연도, 식별용): ${vehicle.year}년
- 최초 등록일 (⚠️ 차령 계산 기준): ${vehicle.registered_at ?? "정보 없음"}
  → 감가 산정 시 "오늘 − 최초 등록일" 을 차령으로 사용하세요. 연식이 아니라 등록일이 기준입니다.
- 주행거리: ${vehicle.mileage} km (연 1.5~2만 km 기준선 대비 +/- 보정)
- 연료: ${vehicle.fuel_type ?? "정보 없음"}
- 변속기: ${vehicle.transmission ?? "정보 없음"}
- 배기량: ${vehicle.displacement_cc ? `${vehicle.displacement_cc} cc` : "정보 없음"}
- 차체 형상: ${vehicle.body_type ?? "정보 없음"}
- 차종: ${vehicle.vehicle_class ?? "정보 없음"}
- 승차 정원: ${vehicle.seating_capacity != null ? `${vehicle.seating_capacity}명` : "정보 없음"} (9인승·11인승 등 정원에 따라 다른 시장 형성)
- 외장 색상: ${vehicle.color ?? "정보 없음"} (인기색: 검정·흰색·회색·은색은 표준. 빨강·노랑·파랑 등 호불호 색은 -1~3%)
- 내장 색상: ${vehicle.interior_color ?? "정보 없음"} (검정 모노톤은 표준, 베이지 투톤은 호불호 -0~2%)
- 원동기 형식: ${vehicle.engine_code ?? "정보 없음"} (특정 엔진은 결함 이력으로 감가 영향 가능)
- 차대번호: ${vehicle.vin ?? "정보 없음"}
${plateLine}
- 추가 옵션: ${optionList}

${damageSection}

정비/사고 이력 (총 ${maintenance.length}건, 사고 ${accidentCount}건 / 판금·교환·수리 ${repairCount}건):
${maintenanceLines}

${loanSection}

옵션 반영 가이드:
- 파노라마 선루프, 가죽시트(나파), 통풍시트, 헤드업 디스플레이, 어댑티브 크루즈, 어라운드뷰 등 상위 옵션은 동급 대비 가산 요인입니다(통상 +1~5%).
- 배기량과 차체형상은 동일 모델 내에서도 시세를 크게 가르는 변수입니다. SUV/하이브리드/전기는 일반적으로 감가율이 낮은 편.

[감가 적용 — 외판/사고 이력]
- 외판 판금 이력: 부위당 통상 -1~3% 감가 (위치·면적에 따라).
- 외판 교환 이력: 부위당 통상 -3~8% 감가. 판금보다 큰 폭. 주요 골격(보닛·트렁크·루프·도어) 교환은 특히 큰 감가.
- 외판 다수 부위 동시 손상 (3곳 이상)은 사고 이력으로 보고 누적 감가 -10~25%.
- **🔧 감가 미반영 부위 (절대 원칙)**: 앞범퍼·뒷범퍼·휠은 판금/교환/수리되어도 **중고 매매업자도 감가 대상으로 보지 않습니다**. 소모성 외판으로 간주되어 시세에 반영하지 않습니다.
- 정기 정비(엔진오일·브레이크·소모품) 이력이 충실하면 관리 상태가 좋다는 신호 → 감가 폭 일부 보정 (+0~2%).
- 이력이 비어있으면 일반적 동급 시세를 추정.

[매각 시점 미수리 손상 — 수리비만큼 추가 차감]
- **매수자(딜러·개인) 는 차량 인수 시점에 발견되는 스크래치·찌그러짐·파손 부위에 대해 "수리비 추정액" 만큼 매각가에서 차감을 요청합니다.** 한국 중고차 시장의 일반 관행입니다.
- 차주가 외판 상태를 "판금" 또는 "교환" 으로 입력했지만 실제로는 수리되지 않은 상태로 매각하는 경우, 매수자가 보는 견적은:
  · 도장(작은 스크래치): 부위당 5~20만원 차감
  · 판금(찌그러짐): 부위당 20~60만원 차감
  · 외판 교환 필요(파손): 부위당 50~200만원 차감
- 위 수리비 추정액은 시세 외에 **별도로 차감** 되므로 rationale 의 [매각 권고] 단락에 미수리 부위가 있을 경우 "매각 전 수리 권장" 또는 "수리비 N만원 추가 감가 예상" 을 명시하세요.
- 입력된 외판 상태는 "수리 완료 가정" 으로 해석합니다. 미수리 상태라면 차주가 수리 후 매각하는 것이 매각가 보전에 유리합니다.

다음 JSON 스키마로만 응답해 주세요. 설명, 주석, 마크다운 코드펜스 없이 JSON 객체만 출력합니다.
{
  "current_price": <원 단위 현재 업자 매입가 정수>,
  "predicted_1m": <1개월 후 예상 업자 매입가 정수>,
  "predicted_3m": <3개월 후>,
  "predicted_6m": <6개월 후>,
  "predicted_1y": <1년 후>,
  "predicted_2y": <2년 후>,
  "predicted_3y": <3년 후>,
  "signal": "sell_now" | "review" | "hold",
  "rationale": "한국어 3단락 (각 단락은 \\n\\n 으로 구분). 단락 형식:\\n(1) [시세 평가] 현재 업자 매입가 추정 근거 — 모델/연식/주행거리/연료/외판상태가 가격에 미친 영향 + 소매가 대비 차감폭 명시.\\n(2) [대출 분석] 현재 잔액과 매각 시 순수령액(업자 매입가 − 잔액). 잔액 완납 시점이 시세 하락 시점보다 빠른지 느린지. 대출 없으면 '대출 없음 — 매각가 전액 수령' 한 줄.\\n(3) [매각 권고] sell_now/review/hold 중 선택한 신호의 핵심 이유 1~2문장."
}

장기 예측 가이드:
- 국산 중형 세단 기준 연간 감가율은 통상 1년차 약 12~15%, 2년차 8~10%, 3년차 6~8% 수준이며, 수입차/인기 모델/전기차는 다를 수 있습니다.
- 주행거리 누적(연 2만 km 가정)도 함께 반영.
- 모델 단종/페이스리프트/세대교체 일정이 있으면 가속 감가.

signal 기준:
- sell_now: 현재가가 향후 12개월 이내 예상가보다 명확히 높을 때
- review: 단기는 안정적이나 장기(1~3년) 전망이 크게 떨어질 때
- hold: 가까운 미래에 인상 요인이 있거나 시세가 단단할 때`;
}
