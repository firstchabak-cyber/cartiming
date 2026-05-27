export const DAMAGE_STATES = ["없음", "판금", "교환"] as const;
export type DamageState = (typeof DAMAGE_STATES)[number];

export type DamageMap = Record<string, DamageState>;

export const DAMAGE_COLORS: Record<DamageState, { fill: string; text: string; label: string }> = {
  없음: { fill: "#f8fafc", text: "#64748b", label: "이상 없음" },
  판금: { fill: "#fde68a", text: "#92400e", label: "판금" },
  교환: { fill: "#fca5a5", text: "#7f1d1d", label: "교환" },
};

export function nextDamageState(current: DamageState | undefined): DamageState {
  const idx = DAMAGE_STATES.indexOf((current ?? "없음") as DamageState);
  return DAMAGE_STATES[(idx + 1) % DAMAGE_STATES.length];
}

// CarDiagram 의 외판 부위 (서버에서도 검증에 사용 — 클라이언트 컴포넌트 import 없이)
export const CAR_BODY_PARTS = [
  "앞범퍼",
  "앞펜더(좌)",
  "본넷",
  "앞펜더(우)",
  "사이드미러(좌)",
  "사이드미러(우)",
  "앞도어(좌)",
  "루프",
  "앞도어(우)",
  "뒷도어(좌)",
  "뒷도어(우)",
  "뒷펜더(좌)",
  "트렁크",
  "뒷펜더(우)",
  "뒷범퍼",
] as const;
export type CarBodyPart = (typeof CAR_BODY_PARTS)[number];

// 시세 감가에 반영되지 않는 부위 (앞범퍼·뒷범퍼·휠)
export const NON_DEPRECIATING_PARTS = new Set<string>([
  "앞범퍼",
  "뒷범퍼",
  "휠(좌앞)",
  "휠(우앞)",
  "휠(좌뒤)",
  "휠(우뒤)",
]);
