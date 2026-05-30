import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  businessName: z.string().trim().min(1).max(100),
  businessRegNumber: z.string().trim().min(8).max(20),
  contactPhone: z.string().trim().min(1),
  location: z.string().trim().optional(),
  // 인증 서류 storage 경로 (dealer-docs 버킷). 본인 폴더(user_id/...)만 허용.
  businessRegDocPath: z.string().trim().max(300).optional(),
  dealerCardDocPath: z.string().trim().max(300).optional(),
});

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
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // 서류 경로는 본인 폴더(user_id/...) 인 것만 신뢰 (위조 방지)
  const ownPrefix = `${user.id}/`;
  const regDoc =
    parsed.data.businessRegDocPath &&
    parsed.data.businessRegDocPath.startsWith(ownPrefix)
      ? parsed.data.businessRegDocPath
      : undefined;
  const cardDoc =
    parsed.data.dealerCardDocPath &&
    parsed.data.dealerCardDocPath.startsWith(ownPrefix)
      ? parsed.data.dealerCardDocPath
      : undefined;

  const upsertRow: Record<string, unknown> = {
    user_id: user.id,
    business_name: parsed.data.businessName,
    business_reg_number: parsed.data.businessRegNumber,
    contact_phone: parsed.data.contactPhone,
    location: parsed.data.location ?? null,
  };
  // 새로 업로드한 서류가 있을 때만 갱신 (없으면 기존 값 유지)
  if (regDoc) upsertRow.business_reg_doc_path = regDoc;
  if (cardDoc) upsertRow.dealer_card_doc_path = cardDoc;

  const { error } = await supabase
    .from("dealers")
    .upsert(upsertRow, { onConflict: "user_id" });
  if (error) {
    return NextResponse.json(
      { error: "딜러 등록 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, verified: false });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const { data } = await supabase
    .from("dealers")
    .select(
      "business_name, business_reg_number, contact_phone, location, verified, rating_avg, rating_count, created_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ dealer: data });
}
