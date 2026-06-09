import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createAndDispatch } from "@/lib/notify/dispatch";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";

export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean() });

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "입력 오류" }, { status: 400 });

  // 본인 활성 차량인지 확인
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, status, auto_watch, auto_watch_paid")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vehicle || vehicle.status !== "active") {
    return NextResponse.json(
      { error: "내 활성 차량이 아니에요" },
      { status: 404 },
    );
  }

  const admin = createAdminClient();

  // ── 끄기 — 차감 없이 바로 ──
  if (!parsed.data.enabled) {
    await admin
      .from("vehicles")
      .update({ auto_watch: false })
      .eq("id", vehicle.id);
    return NextResponse.json({ ok: true, on: false, charged: 0 });
  }

  // ── 켜기 ──
  // 이미 이 차량에 결제한 적 있으면 차감 없이 켜기만
  if (vehicle.auto_watch_paid) {
    await admin
      .from("vehicles")
      .update({ auto_watch: true })
      .eq("id", vehicle.id);
    return NextResponse.json({ ok: true, on: true, charged: 0 });
  }

  // 최초 결제 — 1,000캐시 차감
  const { data: credit } = await admin
    .from("user_credits")
    .select("balance, lifetime_member")
    .eq("user_id", user.id)
    .maybeSingle();
  const isLifetime = credit?.lifetime_member === true;
  const balance = credit?.balance ?? 0;

  if (!isLifetime && balance < NOTIFICATION_ENABLE_COST) {
    return NextResponse.json(
      {
        error: `자동 감시를 켜려면 ${NOTIFICATION_ENABLE_COST.toLocaleString("ko-KR")} 캐시가 필요해요.`,
        code: "insufficient_credits",
        required: NOTIFICATION_ENABLE_COST,
      },
      { status: 402 },
    );
  }

  // 평생회원은 차감 없이, 일반은 1,000 차감
  let charged = 0;
  if (!isLifetime) {
    const newBalance = balance - NOTIFICATION_ENABLE_COST;
    await admin
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await admin.from("credit_transactions").insert({
      user_id: user.id,
      type: "monitoring",
      amount: -NOTIFICATION_ENABLE_COST,
      balance_after: newBalance,
      description: "차량 자동 매각 감시 활성화",
      ref_id: vehicle.id,
    });
    charged = NOTIFICATION_ENABLE_COST;
  }

  // 차량 감시 ON + 결제완료 표시
  await admin
    .from("vehicles")
    .update({ auto_watch: true, auto_watch_paid: true })
    .eq("id", vehicle.id);

  // 이메일이 실제로 발송되도록 계정 수신 플래그도 ON (한 대라도 켜면 메일 받음)
  await admin
    .from("user_credits")
    .update({ email_notifications: true })
    .eq("user_id", user.id);

  // 확인 알림(인앱+이메일)
  await createAndDispatch(admin, {
    userId: user.id,
    vehicleId: vehicle.id,
    type: "system",
    title: "🔔 자동 매각 감시가 켜졌어요",
    message:
      "이제 매월 자동으로 이 차의 시세를 분석해, 매각 적기·시세 변동이 생기면 이메일로 먼저 알려드려요.",
    email: true,
  });

  return NextResponse.json({ ok: true, on: true, charged });
}
