import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
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
    return NextResponse.json({ error: "구독 정보 오류" }, { status: 400 });
  }

  const admin = createAdminClient();

  // notif_reward_granted = "알림 활성화 비용을 이미 1회 차감했는지" 플래그로 재활용.
  // 최초 1회만 500캐시 차감. 끄고 다시 켜도 추가 차감 없음. 평생회원은 무료.
  const { data: credit } = await admin
    .from("user_credits")
    .select("balance, lifetime_member, notif_reward_granted")
    .eq("user_id", user.id)
    .maybeSingle();

  const alreadyCharged = credit?.notif_reward_granted === true;
  const isLifetime = credit?.lifetime_member === true;
  const needCharge = !alreadyCharged && !isLifetime;

  // 잔액 부족 → 구독 저장 전에 막고 충전 유도
  if (needCharge && (credit?.balance ?? 0) < NOTIFICATION_ENABLE_COST) {
    return NextResponse.json(
      {
        error: `휴대폰 알림을 켜려면 ${NOTIFICATION_ENABLE_COST} 캐시가 필요합니다. 캐시를 충전해 주세요.`,
        code: "insufficient_credits",
        required: NOTIFICATION_ENABLE_COST,
      },
      { status: 402 },
    );
  }

  // endpoint unique → 같은 기기 재구독은 user_id 갱신
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json(
      { error: "구독 저장 실패", detail: error.message },
      { status: 500 },
    );
  }

  // 최초 1회 차감
  let charged = 0;
  if (needCharge) {
    const newBalance = (credit?.balance ?? 0) - NOTIFICATION_ENABLE_COST;
    const { error: updErr } = await admin
      .from("user_credits")
      .update({
        balance: newBalance,
        notif_reward_granted: true,
        updated_at: new Date().toISOString(),
      })
      // 동시성 방어: 아직 미차감 상태일 때만
      .eq("user_id", user.id)
      .eq("notif_reward_granted", false);

    if (!updErr) {
      charged = NOTIFICATION_ENABLE_COST;
      await admin.from("credit_transactions").insert({
        user_id: user.id,
        type: "monitoring",
        amount: -NOTIFICATION_ENABLE_COST,
        balance_after: newBalance,
        description: "휴대폰 알림 활성화",
      });
    }
  } else if (isLifetime && !alreadyCharged) {
    // 평생회원: 차감 없이 플래그만 기록
    await admin
      .from("user_credits")
      .update({ notif_reward_granted: true })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, charged });
}
