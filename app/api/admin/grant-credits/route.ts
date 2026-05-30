import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((v) => v !== 0, "0 은 허용 안 됨"),
  reason: z.string().trim().min(1).max(200),
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
    return NextResponse.json(
      { error: "입력값 오류", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("user_credits")
    .select("balance")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  const prev = existing?.balance ?? 0;
  const next = prev + parsed.data.amount;
  if (next < 0) {
    return NextResponse.json(
      { error: `잔액이 부족합니다 (현재 ${prev}, 회수 요청 ${-parsed.data.amount})` },
      { status: 400 },
    );
  }

  await admin
    .from("user_credits")
    .upsert(
      {
        user_id: parsed.data.userId,
        balance: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  await admin.from("credit_transactions").insert({
    user_id: parsed.data.userId,
    type: parsed.data.amount > 0 ? "admin_grant" : "admin_revoke",
    amount: parsed.data.amount,
    balance_after: next,
    description: parsed.data.reason,
  });

  // 캐시가 지급된 경우(양수) 고객에게 알림 — 마케팅/보상 효과를 위해
  if (parsed.data.amount > 0) {
    await createAndDispatch(admin, {
      userId: parsed.data.userId,
      type: "system",
      title: `🎁 캐시 ${parsed.data.amount.toLocaleString("ko-KR")} 지급`,
      message:
        `운영자가 캐시 ${parsed.data.amount.toLocaleString("ko-KR")}을 지급했어요.\n` +
        `사유: ${parsed.data.reason}\n현재 잔액: ${next.toLocaleString("ko-KR")} 캐시`,
      email: true,
    });
  }

  return NextResponse.json({ ok: true, newBalance: next });
}
