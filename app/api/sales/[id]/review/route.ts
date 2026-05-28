import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  anonymous: z.boolean().optional(),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값 오류", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // 본인 매각 신청 + 완료 상태인지 확인
  const { data: sale } = await supabase
    .from("sale_requests")
    .select("id, user_id, status, selected_bid_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json(
      { error: "매각 신청을 찾을 수 없습니다" },
      { status: 404 },
    );
  }
  if (sale.status !== "completed") {
    return NextResponse.json(
      { error: "매각 완료 처리 후에만 후기 작성 가능합니다" },
      { status: 400 },
    );
  }
  if (!sale.selected_bid_id) {
    return NextResponse.json(
      { error: "선택된 딜러가 없습니다" },
      { status: 400 },
    );
  }

  // 선택된 입찰에서 딜러 user_id 가져오기
  const { data: bid } = await supabase
    .from("sale_bids")
    .select("dealer_id")
    .eq("id", sale.selected_bid_id)
    .maybeSingle();
  if (!bid?.dealer_id) {
    return NextResponse.json(
      {
        error:
          "운영자가 수동 등록한 입찰은 후기 대상 딜러를 식별할 수 없어 후기를 남길 수 없습니다",
      },
      { status: 400 },
    );
  }

  // 이미 후기 있는지
  const { data: existing } = await supabase
    .from("dealer_reviews")
    .select("id")
    .eq("sale_request_id", sale.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "이미 후기를 작성하셨습니다" },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("dealer_reviews")
    .insert({
      sale_request_id: sale.id,
      dealer_id: bid.dealer_id,
      customer_user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      anonymous: parsed.data.anonymous ?? false,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "후기 저장 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
