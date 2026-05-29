import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean() });

/** 현재 이메일 알림 수신 여부 조회 */
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
    .select("email_notifications")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ enabled: data?.email_notifications !== false });
}

/** 이메일 알림 수신 on/off */
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_credits")
    .update({ email_notifications: parsed.data.enabled })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
