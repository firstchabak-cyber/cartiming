import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

const schema = z.object({
  dealerName: z.string().trim().min(1).max(100),
  dealerPhone: z.string().trim().optional(),
  dealerLocation: z.string().trim().optional(),
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
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
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

  const admin = createAdminClient();

  // sale_request 가 입찰 가능 상태인지
  const { data: sale } = await admin
    .from("sale_requests")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다" }, { status: 404 });
  }
  if (!["pending", "bidding"].includes(sale.status)) {
    return NextResponse.json(
      { error: "입찰 가능한 상태가 아닙니다" },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("sale_bids")
    .insert({
      sale_request_id: params.id,
      dealer_id: null, // 운영자 대리 등록 → dealer_id 없음
      dealer_name: parsed.data.dealerName,
      dealer_phone: parsed.data.dealerPhone ?? null,
      dealer_location: parsed.data.dealerLocation ?? null,
      bid_amount: parsed.data.bidAmount,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "등록 실패", detail: error.message },
      { status: 500 },
    );
  }

  if (sale.status === "pending") {
    await admin
      .from("sale_requests")
      .update({ status: "bidding" })
      .eq("id", params.id);
  }

  return NextResponse.json({ id: data.id });
}
