import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const admin = createAdminClient();

  // pending → confirmed 로 '조건부' 갱신. 갱신된 행이 있을 때만 캐시 지급(중복 승인·동시 처리 방지).
  const { data: updated } = await admin
    .from("deposit_requests")
    .update({
      status: "confirmed",
      processed_by: user.email,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .select("user_id, credits, amount_krw, depositor_name")
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      { error: "이미 처리되었거나 존재하지 않는 신청입니다" },
      { status: 409 },
    );
  }

  const targetUserId = updated.user_id as string;
  const credits = updated.credits as number;

  // 캐시 지급 (잔액 + 원장 기록) — grant-credits 와 동일한 방식.
  const { data: existing } = await admin
    .from("user_credits")
    .select("balance")
    .eq("user_id", targetUserId)
    .maybeSingle();
  const prev = existing?.balance ?? 0;
  const next = prev + credits;

  await admin.from("user_credits").upsert(
    { user_id: targetUserId, balance: next, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  await admin.from("credit_transactions").insert({
    user_id: targetUserId,
    type: "charge",
    amount: credits,
    balance_after: next,
    description: `계좌입금 충전 (입금자: ${updated.depositor_name})`,
    ref_id: params.id,
  });

  // 고객에게 알림 (인앱 + 이메일)
  await createAndDispatch(admin, {
    userId: targetUserId,
    type: "system",
    title: `💰 캐시 ${credits.toLocaleString("ko-KR")} 충전 완료`,
    message:
      `입금이 확인되어 캐시 ${credits.toLocaleString("ko-KR")}을 지급했어요.\n` +
      `현재 잔액: ${next.toLocaleString("ko-KR")} 캐시`,
    email: true,
  });

  return NextResponse.json({ ok: true, newBalance: next });
}
