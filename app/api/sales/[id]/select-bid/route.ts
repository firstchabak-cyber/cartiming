import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ bidId: z.string().uuid() });

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bidId 가 필요합니다" }, { status: 400 });
  }

  const { data: sale } = await supabase
    .from("sale_requests")
    .select("id, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (!["pending", "bidding"].includes(sale.status)) {
    return NextResponse.json(
      { error: "이미 처리된 신청입니다" },
      { status: 400 },
    );
  }

  // 입찰 검증
  const { data: bid } = await supabase
    .from("sale_bids")
    .select("id, sale_request_id, status")
    .eq("id", parsed.data.bidId)
    .eq("sale_request_id", params.id)
    .maybeSingle();
  if (!bid) {
    return NextResponse.json({ error: "입찰을 찾을 수 없습니다" }, { status: 404 });
  }

  const admin = createAdminClient();
  // sale_request 업데이트
  await admin
    .from("sale_requests")
    .update({
      status: "matched",
      selected_bid_id: bid.id,
      matched_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  // 선택된 입찰 status=selected, 나머지는 rejected
  await admin
    .from("sale_bids")
    .update({ status: "selected" })
    .eq("id", bid.id);
  await admin
    .from("sale_bids")
    .update({ status: "rejected" })
    .eq("sale_request_id", params.id)
    .neq("id", bid.id)
    .eq("status", "offered");

  return NextResponse.json({ ok: true });
}
