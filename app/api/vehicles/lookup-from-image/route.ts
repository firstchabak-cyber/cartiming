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
입력 이미지가 자동차등록증이 아니거나 글자를 읽을 수 없으면 "not_registration": true 를 반환하세요.
모든 필드는 읽히지 않으면 null. 추측하지 마세요.

다음 JSON 스키마로만 응답하세요 (다른 텍스트, 마크다운 펜스 금지):

{
  "not_registration": boolean,
  "manufacturer": string | null,          // 제조사. "차명" 에서 첫 단어. 예: "현대", "기아", "BMW"
  "model": string | null,                  // 모델명. "차명" 에서 제조사 제외한 나머지. 예: "그랜저 IG", "쏘렌토 MQ4"
  "trim": string | null,                   // 세부 등급. 등록증에 거의 없음 — 보통 null
  "year": number | null,                   // 4자리 연도. "제작연월일" 의 연도
  "registered_at": string | null,          // "YYYY-MM-DD". "최초등록일"
  "fuel_type": "gasoline"|"diesel"|"hybrid"|"ev"|"lpg" | null,
                                            // "사용연료" 매핑: 휘발유/가솔린→gasoline, 경유/디젤→diesel,
                                            // 하이브리드→hybrid, 전기→ev, LPG/엘피지→lpg
  "transmission": "auto" | "manual" | null,// 등록증에 거의 없음 — 보통 null
  "displacement_cc": number | null,        // 배기량. "1999cc" 등에서 숫자만
  "body_type": "sedan"|"suv"|"hatchback"|"coupe"|"wagon"|"van"|"pickup"|"convertible"|"other" | null,
                                            // "차체의 형상" 매핑: 세단→sedan, 다목적형/SUV→suv,
                                            // 해치백→hatchback, 쿠페→coupe, 왜건→wagon, 밴→van,
                                            // 픽업→pickup, 컨버터블→convertible, 기타→other
  "vehicle_class": "passenger"|"van"|"truck"|"special" | null,
                                            // "차종" 매핑: 승용→passenger, 승합→van, 화물→truck, 특수→special
  "engine_code": string | null,            // "원동기 형식". 예: "G6DM", "D4HA"
  "seating_capacity": number | null,       // "승차정원"
  "color": string | null,                  // 외장 색상 (등록증에 있는 경우만)
  "vin": string | null,                    // 차대번호 (11~17자)
  "plate_number": string | null            // 자동차등록번호. 예: "12가3456"
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

  const vehicle: LookupResult["vehicle"] = {
    manufacturer: parsed.manufacturer ?? undefined,
    model: parsed.model ?? undefined,
    trim: parsed.trim ?? undefined,
    year: parsed.year ?? undefined,
    fuel_type: parsed.fuel_type ?? undefined,
    transmission: parsed.transmission ?? undefined,
    displacement_cc: parsed.displacement_cc ?? undefined,
    body_type: parsed.body_type ?? undefined,
    vehicle_class: parsed.vehicle_class ?? undefined,
    engine_code: parsed.engine_code ?? undefined,
    color: parsed.color ?? undefined,
    plate_number: parsed.plate_number ?? undefined,
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
