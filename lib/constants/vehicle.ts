// 옵션이 시세를 크게 가르는 고가·슈퍼카 브랜드 — 매각 신청 시 옵션 등록 의무
export const SUPERCAR_BRANDS = [
  "포르쉐",
  "페라리",
  "벤틀리",
  "람보르기니",
  "마세라티",
  "롤스로이스",
  "맥라렌",
  "애스턴마틴",
  "부가티",
  "포르셰",
  "porsche",
  "ferrari",
  "bentley",
  "lamborghini",
  "maserati",
  "rolls-royce",
  "rollsroyce",
  "mclaren",
  "astonmartin",
  "aston martin",
  "bugatti",
] as const;

/** 제조사 문자열이 옵션 의무 브랜드인지 (공백·대소문자 무시) */
export function isSupercarBrand(manufacturer: string | null | undefined): boolean {
  if (!manufacturer) return false;
  const norm = manufacturer.replace(/\s+/g, "").toLowerCase();
  return SUPERCAR_BRANDS.some(
    (b) => norm === b.replace(/\s+/g, "").toLowerCase(),
  );
}

export const BODY_TYPES = [
  "sedan",
  "suv",
  "hatchback",
  "coupe",
  "wagon",
  "van",
  "pickup",
  "convertible",
  "other",
] as const;

export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: "세단",
  suv: "SUV",
  hatchback: "해치백",
  coupe: "쿠페",
  wagon: "왜건",
  van: "밴",
  pickup: "픽업",
  convertible: "컨버터블",
  other: "기타",
};

export const VEHICLE_CLASSES = [
  "passenger",
  "van",
  "truck",
  "special",
] as const;

export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  passenger: "승용",
  van: "승합",
  truck: "화물",
  special: "특수",
};

export const FUEL_LABELS: Record<string, string> = {
  gasoline: "가솔린",
  diesel: "디젤",
  hybrid: "하이브리드",
  ev: "전기",
  lpg: "LPG",
};

export const TRANSMISSION_LABELS: Record<string, string> = {
  auto: "자동",
  manual: "수동",
};

export const OPTION_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "외관·라이트",
    items: [
      "파노라마 선루프",
      "일반 선루프",
      "LED 헤드램프",
      "매트릭스 LED",
      "프로젝션 LED 테일램프",
    ],
  },
  {
    group: "시트·인테리어",
    items: [
      "나파 가죽시트",
      "일반 가죽시트",
      "통풍시트 (앞)",
      "통풍시트 (뒤)",
      "열선시트 (앞)",
      "열선시트 (뒤)",
      "열선 스티어링휠",
      "전동시트 (운전석)",
      "전동시트 (조수석)",
      "메모리시트",
      "디지털 클러스터",
      "헤드업 디스플레이",
      "앰비언트 라이트",
    ],
  },
  {
    group: "안전·주행보조",
    items: [
      "어댑티브 크루즈컨트롤",
      "차선 유지 보조 (LKA)",
      "차선 이탈 경보 (LDW)",
      "후측방 경보 (BCW)",
      "사각지대 경보 (BSD)",
      "어라운드뷰 모니터",
      "후방카메라",
      "전방카메라",
      "전·후방 주차센서",
      "자동긴급제동 (AEB)",
      "오토홀드",
    ],
  },
  {
    group: "미디어·편의",
    items: [
      "안드로이드 오토",
      "애플 카플레이",
      "내비게이션 (순정)",
      "프리미엄 사운드",
      "무선 충전",
      "스마트키",
      "버튼시동",
      "하이패스 (내장)",
      "전동 트렁크",
      "전동 폴딩 사이드미러",
      "와이퍼 레인센서",
      "자동 라이트",
    ],
  },
];

export const ALL_OPTIONS: string[] = OPTION_GROUPS.flatMap((g) => g.items);
