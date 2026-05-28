import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  bidAmount: z.number().int().positive(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 딜러 자격 확인
  const { data: dealer } = await supabase
    .from("dealers")
    .select("business_name, contact_phone, location, verified")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) {
    return NextResponse.json(
      { error: "딜러 등록이 필요합니다. /dealer/register 에서 등록해주세요." },
      { status: 403 },
    );
  }
  if (!dealer.verified) {
    return NextResponse.json(
      { error: "딜러 인증 대기 중입니다. 운영자 승인 후 입찰 가능합니다." },
      { status: 403 },
    );
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
      { error: "입력값이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  // 매물 상태 확인
  const { data: sale } = await supabase
    .from("sale_requests")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다" }, { status: 404 });
  }
  if (sale.status !== "bidding") {
    return NextResponse.json(
      { error: "입찰 가능한 매물이 아닙니다 (관리자 승인 대기 중이거나 마감됨)" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sale_bids")
    .insert({
      sale_request_id: params.id,
      dealer_id: user.id,
      dealer_name: dealer.business_name,
      dealer_phone: dealer.contact_phone,
      dealer_location: dealer.location,
      bid_amount: parsed.data.bidAmount,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "입찰 저장 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
