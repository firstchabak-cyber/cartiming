import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

const schema = z.object({
  method: z.enum(["bank_transfer", "cash", "card", "other"]).optional(),
  note: z.string().trim().max(500).optional(),
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {}
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: txn } = await admin
    .from("sale_transactions")
    .select(
      "id, fee_status, fee_amount, source_sale_request_id, snapshot_manufacturer, snapshot_model",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!txn) {
    return NextResponse.json({ error: "거래 없음" }, { status: 404 });
  }
  if (txn.fee_status !== "charged") {
    return NextResponse.json(
      { error: "청구 상태에서만 입금 신고 가능합니다" },
      { status: 400 },
    );
  }
  if (!txn.source_sale_request_id) {
    return NextResponse.json({ error: "거래 정보 불완전" }, { status: 400 });
  }

  const { data: sr } = await admin
    .from("sale_requests")
    .select("selected_bid_id")
    .eq("id", txn.source_sale_request_id)
    .maybeSingle();
  if (!sr?.selected_bid_id) {
    return NextResponse.json({ error: "선정 입찰 없음" }, { status: 400 });
  }
  const { data: bid } = await admin
    .from("sale_bids")
    .select("dealer_id, dealer_name")
    .eq("id", sr.selected_bid_id)
    .maybeSingle();
  if (bid?.dealer_id !== user.id) {
    return NextResponse.json({ error: "본 거래의 딜러만 가능" }, { status: 403 });
  }

  await admin
    .from("sale_transactions")
    .update({
      fee_payment_reported_at: new Date().toISOString(),
      fee_payment_method: parsed.data.method ?? "bank_transfer",
      fee_note: parsed.data.note ?? null,
    })
    .eq("id", params.id);

  // 운영자(들)에게 알림 — listUsers 1회만
  const car = `${txn.snapshot_manufacturer} ${txn.snapshot_model}`;
  const feeStr = (txn.fee_amount ?? 0).toLocaleString("ko-KR");
  const { data: admins } = await admin.auth.admin.listUsers();
  const adminUserIds = (admins?.users ?? [])
    .filter((u: { email?: string }) => u.email && ADMIN_EMAILS.has(u.email.toLowerCase()))
    .map((u: { id: string }) => u.id);
  if (adminUserIds.length > 0) {
    const notifications = adminUserIds.map((adminUserId: string) => ({
      user_id: adminUserId,
      type: "system" as const,
      title: `[수수료] ${bid?.dealer_name ?? "딜러"} 입금 신고`,
      message:
        `${car} 거래 수수료 ${feeStr}원 입금 완료를 신고했습니다.\n` +
        `/admin/fees 에서 확인 후 '입금 확인' 처리해 주세요.`,
    }));
    await admin.from("notifications").insert(notifications);
  }

  return NextResponse.json({ ok: true });
}
