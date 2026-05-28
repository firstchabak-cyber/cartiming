import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { BUSINESS_INFO } from "@/lib/constants/business";

export const dynamic = "force-dynamic";

const schema = z.object({
  transactionId: z.string().uuid(),
  status: z.enum(["uncharged", "charged", "paid", "waived"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

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

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    fee_status: parsed.data.status,
  };
  if (parsed.data.note !== undefined) update.fee_note = parsed.data.note;
  if (parsed.data.status === "charged") update.fee_charged_at = now;
  if (parsed.data.status === "paid") update.fee_paid_at = now;
  if (parsed.data.status === "uncharged") {
    update.fee_charged_at = null;
    update.fee_paid_at = null;
  }

  const { error } = await admin
    .from("sale_transactions")
    .update(update)
    .eq("id", parsed.data.transactionId);

  if (error) {
    return NextResponse.json(
      { error: "상태 변경 실패", detail: error.message },
      { status: 500 },
    );
  }

  // 'charged' 로 전환 시 딜러에게 알림 자동 발송 (계좌 정보 포함)
  if (parsed.data.status === "charged") {
    const { data: txn } = await admin
      .from("sale_transactions")
      .select(
        "id, fee_amount, sold_price, sold_at, snapshot_manufacturer, snapshot_model, source_sale_request_id",
      )
      .eq("id", parsed.data.transactionId)
      .maybeSingle();

    if (txn?.source_sale_request_id && txn.fee_amount) {
      // 선정된 딜러 찾기
      const { data: sr } = await admin
        .from("sale_requests")
        .select("selected_bid_id, vehicle_id")
        .eq("id", txn.source_sale_request_id)
        .maybeSingle();
      if (sr?.selected_bid_id) {
        const { data: bid } = await admin
          .from("sale_bids")
          .select("dealer_id")
          .eq("id", sr.selected_bid_id)
          .maybeSingle();
        if (bid?.dealer_id) {
          const bank = BUSINESS_INFO.bankAccount;
          const car = `${txn.snapshot_manufacturer} ${txn.snapshot_model}`;
          const feeStr = txn.fee_amount.toLocaleString("ko-KR");
          const soldStr = txn.sold_price.toLocaleString("ko-KR");
          await admin.from("notifications").insert({
            user_id: bid.dealer_id,
            vehicle_id: sr.vehicle_id,
            type: "system",
            title: `수수료 청구: ${feeStr}원`,
            message:
              `${car} (매각가 ${soldStr}원) 거래 수수료 ${feeStr}원을 청구합니다.\n` +
              `입금 계좌: ${bank.bankName} ${bank.accountNumber} ${bank.accountHolder}\n` +
              `자세한 내역은 /dealer/fees 에서 확인 가능합니다.`,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
