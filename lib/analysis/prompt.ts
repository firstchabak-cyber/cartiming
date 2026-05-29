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
  current_price_min: z.number().nonnegative().optional(),
  current_price_max: z.number().nonnegative().optional(),
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
  today?: string;
  similarSalesText?: string;
  externalQuotesText?: string;
}): string {
  const { vehicle, maintenance, ctx } = args;
  const { loan, balances, monthly } = ctx;
  const today = args.today ?? new Date().toISOString().slice(0, 10);

  // 차령 계산 (오늘 − 최초 등록일, 개월 단위)
  let ageMonthsText = "정보 없음";
  if (vehicle.registered_at) {
    const reg = new Date(vehicle.registered_at);
    const now = new Date(today);
    if (!isNaN(reg.getTime())) {
      const months =
        (now.getFullYear() - reg.getFullYear()) * 12 +
        (now.getMonth() - reg.getMonth());
      ageMonthsText = `${months}개월 (${(months / 12).toFixed(1)}년)`;
    }
  }

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
      return `- 번호판: ${vehicle.plate_number} ⚠️ **렌터카 출신** (한글 "${plateInfo.hangul}") — 시세 -3~5% 정도 감가 (실제 헤이딜러·케이카 견적상 렌터카 페널티는 크지 않음)`;
    if (plateInfo.category === "commercial")
      return `- 번호판: ${vehicle.plate_number} ⚠️ **영업용·택시·배달 출신** (한글 "${plateInfo.hangul}") — 시세 통상 -15~30% 감가`;
    if (plateInfo.category === "private")
      return `- 번호판: ${vehicle.plate_number} (자가용 한글 "${plateInfo.hangul}")`;
    return `- 번호판: ${vehicle.plate_number}`;
  })();

  return `당신은 대한민국 중고차 시장 전문가입니다. 아래 차량의 **업자 매입가** (딜러가 차주로부터 매입하는 시점의 도매 가격) 를 추정하고 매각 의사결정 가이드를 만들어 주세요.

**오늘 날짜: ${today}** (모든 차령·시점 계산은 이 날짜 기준)

[가격 기준 — 절대 원칙 ⭐]
- current_price 와 predicted_* 모든 숫자는 **업자 매입가 기준** 입니다.
- 가장 정확한 벤치마크 우선순위 (위에서부터 적용):
  1. **차주 본인이 입력한 외부 견적** (헤이딜러·케이카 등) — 있으면 그 중앙값 ±5% 이내
  2. **같은 차종 다른 사용자의 외부 견적 통계** — 평균 ±10% 이내
  3. **카타이밍 누적 실거래가** (같은 분류: 자가용↔자가용 / 렌터카↔렌터카)
  4. **헤이딜러·케이카·엔카 평균 매입가 시장 지식** ±5% 이내
- 위 1·2·3 데이터가 있으면 **그것이 시장 지식보다 우선** 합니다. 모델 추정치가 데이터와 크게 어긋나면 데이터에 맞추세요.

[가격 산정 흔한 실수 — 피하기]
1. **이중 차감 금지**: 소매가를 보수적으로 추정한 뒤 또 15% 차감하면 실제 시세보다 20-30% 낮아집니다.
2. **소매-도매 혼동 금지**: 엔카 등 소매가에서 도매가로 변환할 때 10~12% 만 차감 (15% 이상 X).
3. **감가 누적 과잉**: 주행거리, 사고이력, 번호판, 색상 등 모든 요인을 더한 총 감가가 30%를 넘으면 의심하세요. 실제 시장에선 그렇게까지 안 깎입니다.
4. **연식 ≠ 차령**: 반드시 "최초 등록일" 기준 (없으면 연식 - 0.5년 가정).

[Sanity Check 단계 — 산정 직후 필수 자문]
1. 헤이딜러 같은 차종 평균 매입가 vs 내 추정치, ±15% 안인가?
   → 벗어나면 데이터 우선 원칙으로 다시 조정.
2. 같은 모델·연식·주행거리·외판상태 매물의 실거래가/입찰가와 비교했을 때 너무 낮지 않은가?
3. 차량의 신뢰 구간 (current_price_min ~ current_price_max) 안에 외부 견적/실거래가가 들어가는가?
   → 안 들어가면 구간을 넓히거나 중심값을 옮기세요.

[감가 요인 — 한국 시장 실제 비율 ⚠️ 주의]
**전체 합산 감가가 30% 넘어가는 경우는 거의 없습니다.** 아래 비율을 누적 적용하되, 합산 cap 을 두세요.

1순위. **주행거리 (가장 큰 변수)**
   - 기준선: 연 1.5~2만 km (3년차 4.5~6만 km, 5년차 7.5~10만 km)
   - 기준선 대비 +/- 1만 km 당 약 1.5~2% 가감
   - 과주행(기준선의 1.5배 이상): 최대 -10% 추가
   - 저주행(기준선의 0.5배 이하): 최대 +3% 가산

2순위. **외판/사고 이력 (현실적 비율 — 한국 매매업자 기준)**
   - 일반 외판 판금 1곳: -1~2% (도장 새로 한 정도)
   - 일반 외판 교환 1곳: -2~4% (해당 부품 교환 흔적)
   - 골격/프레임 손상 (보닛·트렁크·루프·필러·휠하우스): -10~20% (큰 사고 흔적)
   - **다수 부위 동시 손상 (3곳 이상)**: 사고차로 분류, -15~25% 누적
   - **🔧 감가 미반영 부위 (한국 매매 관행)**: 앞범퍼·뒷범퍼·휠은 판금/교환/수리 되어도 **감가 대상 아님** (소모성 외판).

3순위. **차령 — 연 감가율 (실제 시장)**
   - 1년차: -10~12% (신차 프리미엄 빠지는 구간)
   - 2년차: -8~10%
   - 3~4년차: -6~8%
   - 5~7년차: -5~7%
   - 8년차+: -4~5%
   - 수입차·인기 모델·전기차는 위 수치 -2~3%p (감가율 낮음)
   - 단종 모델·인기 떨어진 모델은 +2~3%p (감가율 높음)

4순위. **번호판 영업용 분류 — 한국 실제 시장**
   - 렌터카 (하·호·허): **-3~5%** (관리 이력 일정해서 페널티 작음)
   - 영업용/택시/배달 (바·사·아·자·배): **-15~25%** (운행 가혹)
   - 자가용 (기타): 0%
   - **위 1·2·3 감가와 별도로 누적** (중복 계산 X)

5순위. **색상·인테리어 (한국 선호도)**
   - 검정·흰색·회색·은색: 0% (표준)
   - 빨강·노랑·파랑·녹색 등 호불호 색: -1~3%
   - 내장 베이지/투톤 (오염 부각): -0~2%

[대출 반영 — 차주의 매각 의사결정 기준]
${loan ? "- 대출 잔액이 있는 차량입니다. 시점별 잔액과 대조해서 매각 손익을 명확히 판단해야 합니다." : "- 대출 없음. 시세가 곧 차주 수령액입니다."}
- 차주 입장에서 의미 있는 숫자는 "업자 매입가 − 그 시점 대출잔액 = 차주 순수령액" 입니다.
- 순수령액이 단기에 음수지만 1년 안에 양수 전환 → hold, 단기 순수령액이 장기보다 명확히 높음 → sell_now, 단순히 시세 하락이 가팔라지면 → review.


차량 정보 (입력된 모든 값을 시세 산정에 반영하세요):
- 제조사: ${vehicle.manufacturer}
- 모델: ${vehicle.model}
- 트림: ${vehicle.trim ?? "정보 없음"} (트림에 따른 옵션·등급 차이를 반영)
- 연식 (모델 연도, 식별용): ${vehicle.year}년
- 최초 등록일: ${vehicle.registered_at ?? "정보 없음"}
- **차령 (오늘 ${today} 기준): ${ageMonthsText}**
  → 위 차령 값을 그대로 사용해서 감가 산정하세요. 직접 계산하거나 추측하지 마세요.
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

${args.externalQuotesText ?? ""}

${args.similarSalesText ?? ""}

${loanSection}

옵션 반영 가이드:
- 파노라마 선루프, 가죽시트(나파), 통풍시트, 헤드업 디스플레이, 어댑티브 크루즈, 어라운드뷰 등 상위 옵션은 동급 대비 가산 요인입니다(통상 +1~5%).
- 배기량과 차체형상은 동일 모델 내에서도 시세를 크게 가르는 변수입니다. SUV/하이브리드/전기는 일반적으로 감가율이 낮은 편.

[감가 적용 — 외판/사고 이력 + 합산 cap]
- 위 "감가 요인 한국 시장 실제 비율" 표 그대로 적용.
- **⚠️ 감가 합산 cap: 모든 감가 요인을 더해도 동급 신규 시세 대비 -35% 를 넘기지 마세요.**
  · 5년 미만 차량은 -25% cap
  · 5~8년 차량은 -30% cap
  · 8년 초과 차량은 -35% cap
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
  "current_price": <원 단위 현재 업자 매입가 정수 — 중심 추정치>,
  "current_price_min": <보수적 하단 — 일반적으로 current_price * 0.92 정도>,
  "current_price_max": <낙관적 상단 — 일반적으로 current_price * 1.08 정도. 헤이딜러 같은 적극 매입처가 부를 수 있는 가격>,
  "predicted_1m": <1개월 후 예상 업자 매입가 정수>,
  "predicted_3m": <3개월 후>,
  "predicted_6m": <6개월 후>,
  "predicted_1y": <1년 후>,
  "predicted_2y": <2년 후>,
  "predicted_3y": <3년 후>,
  "signal": "sell_now" | "review" | "hold",
  "rationale": "한국어 3단락 (각 단락은 \\n\\n 으로 구분). 단락 형식:\\n(1) [시세 평가] 현재 업자 매입가 추정 근거 — 모델/연식/주행거리/연료/외판상태가 가격에 미친 영향 + 신뢰 구간 (min~max) 의 의미 설명 (\\\"보수적 견적 ~ 적극 매입처 견적\\\"). 외부 견적/실거래 데이터가 있으면 그것을 어떻게 반영했는지 명시.\\n(2) [대출 분석] 현재 잔액과 매각 시 순수령액(업자 매입가 − 잔액). 잔액 완납 시점이 시세 하락 시점보다 빠른지 느린지. 대출 없으면 '대출 없음 — 매각가 전액 수령' 한 줄.\\n(3) [매각 권고] sell_now/review/hold 중 선택한 신호의 핵심 이유 1~2문장."
}

[신뢰 구간 (current_price_min ~ current_price_max) 산정 규칙]
- 기본 폭: current_price 의 ±8% (총 16% 폭)
- 외부 견적 데이터가 있으면 그것이 구간 안에 들어가도록 폭 조정
- 외부 견적/실거래 데이터가 5건 이상이면 구간을 좁힘 (±5%)
- 데이터가 전혀 없으면 구간을 넓힘 (±12%)
- min/max 는 의미가 명확해야 함:
  · min = "딜러가 보수적으로 부를 가격" (낮은 매입가)
  · current_price = "평균적인 매입가 (시장 중앙값)"
  · max = "헤이딜러처럼 적극 매입하려는 곳이 부를 가격"

장기 예측 가이드:
- 국산 중형 세단 기준 연간 감가율은 통상 1년차 약 12~15%, 2년차 8~10%, 3년차 6~8% 수준이며, 수입차/인기 모델/전기차는 다를 수 있습니다.
- 주행거리 누적(연 2만 km 가정)도 함께 반영.
- 모델 단종/페이스리프트/세대교체 일정이 있으면 가속 감가.

signal 기준:
- sell_now: 현재가가 향후 12개월 이내 예상가보다 명확히 높을 때
- review: 단기는 안정적이나 장기(1~3년) 전망이 크게 떨어질 때
- hold: 가까운 미래에 인상 요인이 있거나 시세가 단단할 때`;
}
