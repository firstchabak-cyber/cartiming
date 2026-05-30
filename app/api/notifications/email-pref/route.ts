import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";
import { sendEmail, notificationEmailHtml } from "@/lib/email/send";
import { APP_URL } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean() });

/** 알림 켜기 성공 시 환영(확인) 메일 1통 발송 — 실패해도 무시 */
async function sendWelcomeEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const to = profile?.email as string | undefined;
    if (!to) return;
    const title = "이메일 알림이 켜졌어요 🔔";
    const message =
      "이제 매각 적기·시세 변동 같은 중요한 소식을 이 이메일로 보내드려요.\n내 차의 가장 좋은 매각 타이밍을 놓치지 마세요!";
    await sendEmail({
      to,
      subject: `[카타이밍] ${title}`,
      html: notificationEmailHtml({
        title,
        message,
        ctaUrl: `${APP_URL}/dashboard`,
      }),
      text: `${title}\n\n${message}\n\n${APP_URL}/dashboard`,
    });
  } catch {
    // 무시
  }
}

/** 현재 이메일 알림 수신 여부 + 활성화 비용 기납부 여부 조회 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const { data } = await supabase
    .from("user_credits")
    .select("email_notifications, notif_reward_granted, lifetime_member")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    // 기본 OFF (사용자가 켜야 함). 명시적으로 true 일 때만 ON.
    enabled: data?.email_notifications === true,
    alreadyPaid:
      data?.notif_reward_granted === true || data?.lifetime_member === true,
  });
}

/** 이메일 알림 수신 on/off. 최초 ON 시 1회 NOTIFICATION_ENABLE_COST 차감 */
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
    return NextResponse.json({ error: "입력 오류" }, { status: 400 });
  }
  const enabled = parsed.data.enabled;

  const admin = createAdminClient();
  const { data: credit } = await admin
    .from("user_credits")
    .select("balance, lifetime_member, notif_reward_granted")
    .eq("user_id", user.id)
    .maybeSingle();

  const alreadyPaid =
    credit?.notif_reward_granted === true || credit?.lifetime_member === true;

  // 끄기는 차감 없이 바로 저장
  if (!enabled) {
    await admin
      .from("user_credits")
      .update({ email_notifications: false })
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, charged: 0 });
  }

  // 켜기 — 최초면 500캐시 차감
  if (!alreadyPaid) {
    if ((credit?.balance ?? 0) < NOTIFICATION_ENABLE_COST) {
      return NextResponse.json(
        {
          error: `이메일 알림을 켜려면 ${NOTIFICATION_ENABLE_COST} 캐시가 필요합니다.`,
          code: "insufficient_credits",
          required: NOTIFICATION_ENABLE_COST,
        },
        { status: 402 },
      );
    }
    const newBalance = (credit?.balance ?? 0) - NOTIFICATION_ENABLE_COST;
    const { error: updErr } = await admin
      .from("user_credits")
      .update({
        email_notifications: true,
        balance: newBalance,
        notif_reward_granted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("notif_reward_granted", false); // 동시성 방어

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    await admin.from("credit_transactions").insert({
      user_id: user.id,
      type: "monitoring",
      amount: -NOTIFICATION_ENABLE_COST,
      balance_after: newBalance,
      description: "이메일 알림 활성화",
    });
    await sendWelcomeEmail(admin, user.id);
    return NextResponse.json({ ok: true, charged: NOTIFICATION_ENABLE_COST });
  }

  // 이미 비용 낸 경우 — 차감 없이 켜기만
  await admin
    .from("user_credits")
    .update({ email_notifications: true })
    .eq("user_id", user.id);
  await sendWelcomeEmail(admin, user.id);
  return NextResponse.json({ ok: true, charged: 0 });
}
