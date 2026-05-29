import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NOTIFICATION_OPT_IN_REWARD } from "@/lib/credits/constants";

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

  // 첫 알림 활성화 보상 500캐시 (1인 1회) — notif_reward_granted 플래그로 중복 차단
  let rewarded = 0;
  const { data: credit } = await admin
    .from("user_credits")
    .select("balance, notif_reward_granted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (credit && credit.notif_reward_granted !== true) {
    const newBalance = (credit.balance ?? 0) + NOTIFICATION_OPT_IN_REWARD;
    const { error: updErr } = await admin
      .from("user_credits")
      .update({
        balance: newBalance,
        notif_reward_granted: true,
        updated_at: new Date().toISOString(),
      })
      // 동시성 방어: 아직 미지급 상태일 때만 갱신
      .eq("user_id", user.id)
      .eq("notif_reward_granted", false);

    if (!updErr) {
      rewarded = NOTIFICATION_OPT_IN_REWARD;
      await admin.from("credit_transactions").insert({
        user_id: user.id,
        type: "admin_grant",
        amount: NOTIFICATION_OPT_IN_REWARD,
        balance_after: newBalance,
        description: "휴대폰 알림 활성화 보상",
      });
      await admin.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: `🎁 알림 활성화 보상 ${NOTIFICATION_OPT_IN_REWARD} 캐시 지급!`,
        message:
          "휴대폰 푸시 알림을 켜주셔서 감사합니다. 보상 캐시를 드렸어요. 매각 적기를 놓치지 마세요!",
      });
    }
  }

  return NextResponse.json({ ok: true, rewarded });
}
