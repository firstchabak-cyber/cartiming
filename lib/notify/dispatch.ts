import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, notificationEmailHtml } from "@/lib/email/send";
import { APP_URL } from "@/lib/constants/app";

type NotifType = "sell_now" | "price_drop" | "price_rise" | "system";

export type DispatchArgs = {
  userId: string;
  type: NotifType;
  title: string;
  message: string;
  vehicleId?: string | null;
  /** true 면 이메일도 발송(수신 동의한 경우만) — 중요 알림에만 사용 */
  email?: boolean;
};

/**
 * 알림 1건을 생성하고 인앱 + (선택)이메일로 전파.
 * admin = service-role Supabase 클라이언트.
 * 이메일 실패는 무시(인앱 알림은 항상 기록됨).
 * (휴대폰 푸시는 정식 앱 출시 후 도입 예정 — 현재 미사용)
 */
export async function createAndDispatch(
  admin: SupabaseClient,
  args: DispatchArgs,
): Promise<void> {
  // 1) 인앱 알림 (항상)
  await admin.from("notifications").insert({
    user_id: args.userId,
    vehicle_id: args.vehicleId ?? null,
    type: args.type,
    title: args.title,
    message: args.message,
  });

  const url = args.vehicleId
    ? `${APP_URL}/analysis?vehicleId=${args.vehicleId}`
    : `${APP_URL}/notifications`;

  // 2) 이메일 (요청 시 + 수신 동의(명시적 ON) + 주소 있음)
  if (args.email) {
    try {
      const [{ data: pref }, { data: profile }] = await Promise.all([
        admin
          .from("user_credits")
          .select("email_notifications")
          .eq("user_id", args.userId)
          .maybeSingle(),
        admin
          .from("profiles")
          .select("email")
          .eq("id", args.userId)
          .maybeSingle(),
      ]);
      const optedIn = pref?.email_notifications === true; // 명시적으로 켠 경우만
      const to = profile?.email as string | undefined;
      if (optedIn && to) {
        await sendEmail({
          to,
          subject: `[카타이밍] ${args.title}`,
          html: notificationEmailHtml({
            title: args.title,
            message: args.message,
            ctaUrl: url,
          }),
          text: `${args.title}\n\n${args.message}\n\n${url}`,
        });
      }
    } catch {
      // 이메일 실패 무시
    }
  }
}

export type DispatchManyArgs = {
  userIds: string[];
  type: NotifType;
  title: string;
  message: string;
  /** true 면 수신 동의(명시적 ON)한 사용자에게만 이메일도 발송 */
  email?: boolean;
  /** 이메일 클릭 시 이동할 경로 (기본 /notifications) */
  ctaPath?: string;
};

/**
 * 여러 사용자에게 같은 알림을 한 번에 전파.
 * - 인앱 알림은 한 번의 bulk insert (대량도 빠름)
 * - 이메일은 수신 동의한 사용자에게만 병렬 발송 (best-effort)
 * 반환: { inApp: 생성된 인앱 알림 수, emails: 발송 시도한 이메일 수 }
 */
export async function createAndDispatchMany(
  admin: SupabaseClient,
  args: DispatchManyArgs,
): Promise<{ inApp: number; emails: number }> {
  const ids = Array.from(new Set(args.userIds)).filter(Boolean);
  if (ids.length === 0) return { inApp: 0, emails: 0 };

  // 1) 인앱 알림 bulk insert
  await admin.from("notifications").insert(
    ids.map((userId) => ({
      user_id: userId,
      type: args.type,
      title: args.title,
      message: args.message,
    })),
  );

  // 2) 이메일 — 수신 동의 + 주소 있는 사용자에게만
  let emails = 0;
  if (args.email) {
    try {
      const [{ data: prefs }, { data: profiles }] = await Promise.all([
        admin
          .from("user_credits")
          .select("user_id, email_notifications")
          .in("user_id", ids),
        admin.from("profiles").select("id, email").in("id", ids),
      ]);
      const optedIn = new Set(
        (prefs ?? [])
          .filter((p: { email_notifications: boolean | null }) => p.email_notifications === true)
          .map((p: { user_id: string }) => p.user_id),
      );
      const emailMap = new Map<string, string>();
      for (const p of (profiles ?? []) as Array<{ id: string; email: string | null }>) {
        if (p.email) emailMap.set(p.id, p.email);
      }
      const url = `${APP_URL}${args.ctaPath ?? "/notifications"}`;
      const targets = ids
        .filter((id) => optedIn.has(id) && emailMap.has(id))
        .map((id) => emailMap.get(id)!);
      emails = targets.length;
      await Promise.all(
        targets.map((to) =>
          sendEmail({
            to,
            subject: `[카타이밍] ${args.title}`,
            html: notificationEmailHtml({
              title: args.title,
              message: args.message,
              ctaUrl: url,
            }),
            text: `${args.title}\n\n${args.message}\n\n${url}`,
          }).catch(() => {}),
        ),
      );
    } catch {
      // 이메일 실패 무시 (인앱은 이미 기록됨)
    }
  }

  return { inApp: ids.length, emails };
}
