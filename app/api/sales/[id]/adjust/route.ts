import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  finalPrice: z.number().int().positive(),
  reason: z.string().trim().max(1000).optional(),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  // 본인이 선정 딜러인지 확인
  const { data: sale } = await supabase
    .from("sale_requests")
    .select("id, status, selected_bid_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json({ error: "매물 없음" }, { status: 404 });
  }
  if (sale.status !== "matched") {
    return NextResponse.json(
      { error: "선정 완료 상태에서만 조정 가능합니다" },
      { status: 400 },
    );
  }
  const { data: bid } = await supabase
    .from("sale_bids")
    .select("id, dealer_id")
    .eq("id", sale.selected_bid_id ?? "")
    .maybeSingle();
  if (!bid || bid.dealer_id !== user.id) {
    return NextResponse.json(
      { error: "본 매물의 선정 딜러만 조정 가능합니다" },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("sale_requests")
    .update({
      final_price: parsed.data.finalPrice,
      adjustment_reason: parsed.data.reason ?? null,
      adjusted_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "저장 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
