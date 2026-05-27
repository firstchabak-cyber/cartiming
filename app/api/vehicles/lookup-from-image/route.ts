import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel } from "@/lib/gemini/client";
import type { LookupResult } from "@/lib/vehicle-lookup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const EXTRACTION_PROMPT = `
당신은 한국 자동차등록증 사진에서 정보를 추출하는 정확한 OCR + 파서입니다.
입력 이미지가 자동차등록증이 아니거나 글자를 거의 읽을 수 없으면 "not_registration": true 만 반환하세요.
모든 필드는 읽히지 않으면 null. 추측하지 말되, 차명에서 제조사 추론은 한국차 상식 활용 가능합니다.
중요: manufacturer 와 model 에 같은 문자열을 넣지 마세요 — 둘은 항상 분리된 값이어야 합니다.
모든 값은 출력 직전에 좌우 공백·중복 공백을 정리하고 한 번씩만 등장하도록 하세요.

다음 JSON 스키마로만 응답하세요 (다른 텍스트, 마크다운 펜스 금지):

{
  "not_registration": boolean,

  "manufacturer": string | null,
  // 제조사 한글명. 다음 순서로 결정:
  // (1) "차명" 필드 안에 제조사가 명시되어 있으면 그것 (예: "현대 그랜저" → "현대").
  // (2) "차명" 이 모델명만 있으면 모델명으로 제조사 추론. 흔한 매핑:
  //     - 그랜저/쏘나타/아반떼/엑센트/i30/i40/투싼/싼타페/팰리세이드/코나/베뉴/캐스퍼/스타리아/포터/마이티/넥쏘/아이오닉 → "현대"
  //     - K3/K5/K7/K8/K9/모닝/레이/스토닉/셀토스/스포티지/쏘렌토/모하비/카니발/봉고/니로/EV6/EV9 → "기아"
  //     - G70/G80/G90/GV60/GV70/GV80 → "제네시스"
  //     - 토레스/티볼리/렉스턴/코란도/액티언/체어맨 → "KG모빌리티"
  //     - 트레일블레이저/트랙스/이쿼녹스/콜로라도/말리부/스파크/임팔라/카마로 → "쉐보레"
  //     - QM6/SM6/XM3/캡쳐/그랑꼴레오스/조에 → "르노코리아"
  //     - BMW, Mercedes-Benz, Audi, Volkswagen, Volvo, Tesla, Lexus, Toyota, Honda, Porsche, Ford 등 수입차는 모델명에서 추론
  // (3) 위 어느 것에도 해당하지 않으면 null.

  "model": string | null,
  // 모델명 (트림/연식 제외, 세대 코드는 포함). 예:
  //   - 차명 "현대 그랜저 IG 3.0" → "그랜저 IG"
  //   - 차명 "쏘렌토 MQ4" → "쏘렌토 MQ4"
  //   - 차명 "BMW 320i" → "320i"
  // 차명 전체가 단일 모델명이면 차명 그대로 사용.

  "trim": string | null,
  // 세부 트림/등급. 등록증에는 거의 없음 — 보통 null.

  "year": number | null,
  // 4자리 연도. 다음 순서로 결정:
  // (1) "연식" 필드가 있으면 그것 (예: "2023" → 2023)
  // (2) 없으면 "제작연월일" 의 연도 (예: "2022-03-15" → 2022)
  // (3) 둘 다 없으면 "최초등록일" 의 연도

  "registered_at": string | null,
  // "YYYY-MM-DD" 포맷. "최초등록일" 에서.

  "fuel_type": "gasoline"|"diesel"|"hybrid"|"ev"|"lpg" | null,
  // "사용연료" 매핑: 휘발유/가솔린→gasoline, 경유/디젤→diesel,
  // 하이브리드(가솔린+전기 등)→hybrid, 전기→ev, LPG/엘피지/부탄→lpg

  "transmission": "auto" | "manual" | null,
  // 등록증에 거의 없음 — 보통 null.

  "displacement_cc": number | null,
  // 배기량. "1999cc" / "1,999" → 1999. 전기차는 보통 0 이거나 빈칸이면 null.

  "body_type": "sedan"|"suv"|"hatchback"|"coupe"|"wagon"|"van"|"pickup"|"convertible"|"other" | null,
  // "차체의 형상" 매핑: 세단/세단형/4도어세단→sedan, 다목적형/SUV/스포츠유틸→suv,
  // 해치백→hatchback, 쿠페/2도어→coupe, 왜건/스테이션왜건→wagon, 밴/원박스→van,
  // 픽업/픽업트럭→pickup, 컨버터블/오픈카→convertible, 그 외→other

  "vehicle_class": "passenger"|"van"|"truck"|"special" | null,
  // "차종" 매핑: 승용→passenger, 승합→van, 화물→truck, 특수→special

  "engine_code": string | null,
  // "원동기 형식". 예: "G6DM", "D4HA", "N20B20"

  "seating_capacity": number | null,
  // "승차정원" 숫자만.

  "color": string | null,
  // 외장 색상. 등록증에 명시되어 있는 경우만 (보통 없음).

  "vin": string | null,
  // 차대번호. 11~17자 영숫자. 공백 제거.

  "plate_number": string | null
  // 자동차등록번호. "12가3456" / "123가4567" 형태. 공백 제거.
}
`;

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

type Extracted = {
  not_registration?: boolean;
  manufacturer?: string | null;
  model?: string | null;
  trim?: string | null;
  year?: number | null;
  registered_at?: string | null;
  fuel_type?: LookupResult["vehicle"]["fuel_type"] | null;
  transmission?: LookupResult["vehicle"]["transmission"] | null;
  displacement_cc?: number | null;
  body_type?: LookupResult["vehicle"]["body_type"] | null;
  vehicle_class?: LookupResult["vehicle"]["vehicle_class"] | null;
  engine_code?: string | null;
  seating_capacity?: number | null;
  color?: string | null;
  interior_color?: string | null;
  vin?: string | null;
  plate_number?: string | null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "이미지 업로드 형식이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "이미지 파일을 첨부해주세요" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "이미지는 10MB 이하만 업로드 가능합니다" },
      { status: 400 },
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      {
        error:
          "JPG, PNG, WEBP, HEIC 형식의 이미지만 지원합니다 (현재: " +
          (mime || "알수없음") +
          ")",
      },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  let rawText: string;
  try {
    const model = getGeminiModel();
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType: mime === "image/jpg" ? "image/jpeg" : mime,
        },
      },
    ]);
    rawText = result.response.text();
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "AI 분석에 실패했습니다";
    console.error("Gemini vision failed", e);
    return NextResponse.json(
      { error: `AI 분석 실패: ${msg}` },
      { status: 502 },
    );
  }

  let parsed: Extracted;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    console.error("Gemini returned non-JSON", rawText.slice(0, 500));
    return NextResponse.json(
      { error: "AI 응답을 해석하지 못했습니다. 다른 사진으로 시도해주세요" },
      { status: 502 },
    );
  }

  if (parsed.not_registration) {
    return NextResponse.json(
      {
        error:
          "자동차등록증으로 보이지 않습니다. 등록증 사진을 다시 올려주세요",
      },
      { status: 400 },
    );
  }

  const cleanedManufacturer = parsed.manufacturer?.trim() || null;
  const cleanedModelRaw = parsed.model?.trim() || null;
  // manufacturer 와 model 이 동일하게 잡혀오면 model 쪽에서 manufacturer 토큰을 제거
  let cleanedModel = cleanedModelRaw;
  if (
    cleanedManufacturer &&
    cleanedModel &&
    cleanedModel.toLowerCase() === cleanedManufacturer.toLowerCase()
  ) {
    cleanedModel = null;
  } else if (cleanedManufacturer && cleanedModel) {
    const prefix = cleanedManufacturer + " ";
    if (cleanedModel.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanedModel = cleanedModel.slice(prefix.length).trim() || null;
    }
  }

  const vehicle: LookupResult["vehicle"] = {
    manufacturer: cleanedManufacturer ?? undefined,
    model: cleanedModel ?? undefined,
    trim: parsed.trim?.trim() || undefined,
    year: parsed.year ?? undefined,
    fuel_type: parsed.fuel_type ?? undefined,
    transmission: parsed.transmission ?? undefined,
    displacement_cc: parsed.displacement_cc ?? undefined,
    body_type: parsed.body_type ?? undefined,
    vehicle_class: parsed.vehicle_class ?? undefined,
    engine_code: parsed.engine_code?.trim() || undefined,
    color: parsed.color?.trim() || undefined,
    plate_number: parsed.plate_number?.replace(/\s+/g, "") || undefined,
  };

  return NextResponse.json({
    source: "gemini-vision",
    vehicle,
    extra: {
      registered_at: parsed.registered_at ?? null,
      seating_capacity: parsed.seating_capacity ?? null,
      vin: parsed.vin ?? null,
    },
  });
}
