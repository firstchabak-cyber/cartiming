import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatchMany } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({
  target: z.enum(["all", "dealers", "customers"]),
  title: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(2000),
  /** true 면 수신 동의한 사용자에게 이메일도 발송 */
  email: z.boolean().optional(),
});

/**
 * 관리자: 공지(브로드캐스트) 발송.
 * target 에 따라 전체 / 딜러만 / 고객(딜러 제외)에게 인앱 알림 + (선택)이메일 발송.
 */
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값 오류" },
      { status: 400 },
    );
  }
  const { target, title, message, email } = parsed.data;

  const admin = createAdminClient();

  // 대상 user_id 목록 산출
  const { data: profiles } = await admin.from("profiles").select("id");
  const allIds: string[] = (profiles ?? []).map(
    (p: { id: string }) => p.id,
  );

  let targetIds: string[] = allIds;
  if (target !== "all") {
    const { data: dealers } = await admin.from("dealers").select("user_id");
    const dealerIdSet = new Set<string>(
      (dealers ?? []).map((d: { user_id: string }) => d.user_id),
    );
    targetIds =
      target === "dealers"
        ? allIds.filter((id: string) => dealerIdSet.has(id))
        : allIds.filter((id: string) => !dealerIdSet.has(id));
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ error: "발송 대상이 없습니다" }, { status: 400 });
  }

  const result = await createAndDispatchMany(admin, {
    userIds: targetIds,
    type: "system",
    title,
    message,
    email: email === true,
    ctaPath: "/notifications",
  });

  return NextResponse.json({
    ok: true,
    sent: result.inApp,
    emails: result.emails,
  });
}
