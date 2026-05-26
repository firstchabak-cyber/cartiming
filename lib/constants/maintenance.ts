export const MAINTENANCE_CATEGORIES = [
  "교환",
  "판금",
  "수리",
  "정비",
  "사고",
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const CATEGORY_TONE: Record<
  MaintenanceCategory,
  "success" | "warning" | "danger" | "neutral"
> = {
  교환: "warning",
  판금: "warning",
  수리: "neutral",
  정비: "success",
  사고: "danger",
};

export const MAINTENANCE_PARTS = {
  외부: [
    "앞범퍼",
    "뒷범퍼",
    "본넷",
    "트렁크",
    "루프",
    "앞도어(좌)",
    "앞도어(우)",
    "뒷도어(좌)",
    "뒷도어(우)",
    "앞펜더(좌)",
    "앞펜더(우)",
    "뒷펜더(좌)",
    "뒷펜더(우)",
    "사이드미러(좌)",
    "사이드미러(우)",
  ],
  기능부: [
    "엔진",
    "변속기",
    "브레이크",
    "서스펜션",
    "배기",
    "에어컨",
    "전장계통",
  ],
  기타: [
    "타이어",
    "휠",
    "유리",
    "헤드라이트",
    "테일램프",
    "내장재",
    "기타",
  ],
} as const;

export const ALL_PARTS: string[] = Object.values(MAINTENANCE_PARTS).flat();
