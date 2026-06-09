import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  vehicleId: z.string().uuid(),
  reviewText: z
    .string()
    .trim()
    .min(5, "후기를 5자 이상 적어주세요")
    .max(500, "후기는 500자 이내로 적어주세요"),
});

// 개인정보로 보이는 패턴 — 휴대폰 번호, 자동차 번호판
const PHONE_RE = /01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/;
const PLATE_RE = /\d{2,3}\s?[가-힣]\s?\d{4}/;

/** 이름을 식별 불가하게 마스킹: 홍길동 → 홍**, John → J***. 빈 값이면 '카타임 회원'. */
function maskName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n.length === 0) return "카타임 회원";
  if (n.length === 1) return `${n}*`;
  return n[0] + "*".repeat(Math.min(n.length - 1, 3));
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.flatten().fieldErrors.reviewText?.[0] ?? "입력값 오류",
      },
      { status: 400 },
    );
  }

  const text = parsed.data.reviewText;
  if (PHONE_RE.test(text) || PLATE_RE.test(text)) {
    return NextResponse.json(
      {
        error:
          "전화번호·차량번호 같은 개인정보는 후기에 넣을 수 없어요. 빼고 다시 작성해주세요.",
      },
      { status: 400 },
    );
  }

  // 본인 차량인지 확인 + 차량 요약(개인정보 제외) 가져오기
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, manufacturer, model, trim, year, mileage, status")
    .eq("id", parsed.data.vehicleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vehicle || vehicle.status === "deleted") {
    return NextResponse.json(
      { error: "내 차량이 아니거나 찾을 수 없어요" },
      { status: 404 },
    );
  }

  // 신뢰할 수 있는 최신 분석 결과(시세·신호)를 서버에서 직접 조회 (클라이언트 값 불신)
  const { data: analysis } = await supabase
    .from("price_analyses")
    .select("current_price, signal, generated_at")
    .eq("vehicle_id", parsed.data.vehicleId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json(
      { error: "이 차량의 시세 분석을 먼저 받아주세요" },
      { status: 400 },
    );
  }

  // 닉네임용 프로필 이름
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("analysis_reviews").insert({
    user_id: user.id,
    vehicle_id: vehicle.id,
    nickname: maskName(profile?.name),
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    mileage: vehicle.mileage,
    current_price: analysis.current_price,
    signal: analysis.signal,
    review_text: text,
    status: "pending",
  });

  if (error) {
    // 23505 = 차량당 1건 유니크 위반 (이미 후기 있음)
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "이 차량은 이미 후기를 등록했어요 (차량 1대당 1번)" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "후기 저장에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
