import type { LookupResult } from "./index";

const MOCKS: LookupResult["vehicle"][] = [
  {
    manufacturer: "현대",
    model: "그랜저",
    trim: "캘리그래피",
    year: 2022,
    fuel_type: "gasoline",
    transmission: "auto",
    displacement_cc: 2497,
    body_type: "sedan",
    vehicle_class: "passenger",
    engine_code: "G6DM",
    color: "검정",
    options: [
      "파노라마 선루프",
      "나파 가죽시트",
      "통풍시트 (앞)",
      "어댑티브 크루즈컨트롤",
      "헤드업 디스플레이",
    ],
  },
  {
    manufacturer: "기아",
    model: "쏘렌토",
    trim: "그래비티",
    year: 2023,
    fuel_type: "diesel",
    transmission: "auto",
    displacement_cc: 2151,
    body_type: "suv",
    vehicle_class: "passenger",
    engine_code: "R2.2",
    color: "흰색",
    options: [
      "파노라마 선루프",
      "어라운드뷰 모니터",
      "후측방 경보 (BCW)",
      "전동시트 (운전석)",
    ],
  },
  {
    manufacturer: "제네시스",
    model: "G80",
    trim: "스포츠 프레스티지",
    year: 2024,
    fuel_type: "gasoline",
    transmission: "auto",
    displacement_cc: 3470,
    body_type: "sedan",
    vehicle_class: "passenger",
    engine_code: "G3.5T",
    color: "회색",
    options: [
      "나파 가죽시트",
      "헤드업 디스플레이",
      "통풍시트 (앞)",
      "통풍시트 (뒤)",
      "어댑티브 크루즈컨트롤",
      "프리미엄 사운드",
    ],
  },
];

export function lookupViaMock(plate: string): LookupResult["vehicle"] {
  // 차량번호 마지막 숫자로 결정적 분기 (같은 번호 → 같은 결과)
  const lastDigit = parseInt(plate.replace(/\D/g, "").slice(-1), 10);
  const idx = Number.isFinite(lastDigit) ? lastDigit % MOCKS.length : 0;
  return { ...MOCKS[idx], plate_number: plate };
}
