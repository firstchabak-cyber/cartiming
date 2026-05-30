import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

const TOSS_SECRET_KEY =
  process.env.TOSS_SECRET_KEY ?? "test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R";

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
    return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
  }

  // 우리 DB 에 있는 주문과 매칭 확인
  const { data: pending } = await supabase
    .from("payments")
    .select("id, user_id, amount_krw, credits_granted, status")
    .eq("provider_order_id", parsed.data.orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pending) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  if (pending.status === "paid") {
    // 이미 처리된 결제 — 중복 호출 방어
    return NextResponse.json({
      ok: true,
      alreadyProcessed: true,
      creditsGranted: pending.credits_granted,
    });
  }

  if (pending.amount_krw !== parsed.data.amount) {
    return NextResponse.json(
      { error: "결제 금액 불일치" },
      { status: 400 },
    );
  }

  // 토스 결제 승인 API 호출
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  let tossData: { paymentKey?: string; status?: string; method?: string };
  try {
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: parsed.data.paymentKey,
        orderId: parsed.data.orderId,
        amount: parsed.data.amount,
      }),
    });
    tossData = await tossRes.json();
    if (!tossRes.ok) {
      const msg = (tossData as { message?: string }).message ?? "토스 승인 실패";
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", pending.id);
      return NextResponse.json(
        { error: `결제 승인 실패: ${msg}`, detail: tossData },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "토스 결제 API 호출 실패",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  // payment row 업데이트 + 캐시 적립 (admin 클라이언트로 처리)
  const admin = createAdminClient();
  // 원자적 상태 전환 — pending → paid 가 실제로 일어난 경우(1행)만 적립한다.
  // 동시 confirm/재시도/Strict-Mode 중복 호출 시 캐시 이중 적립 방지.
  const { data: claimed } = await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_payment_key: tossData.paymentKey ?? null,
    })
    .eq("id", pending.id)
    .eq("status", "pending")
    .select("id");

  if (!claimed || claimed.length === 0) {
    // 다른 요청이 이미 적립을 끝냈음 — 중복 적립하지 않음
    return NextResponse.json({
      ok: true,
      alreadyProcessed: true,
      creditsGranted: pending.credits_granted,
    });
  }

  // 캐시 적립 — user_credits upsert + transaction insert
  const { data: existing } = await admin
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const prevBalance = existing?.balance ?? 0;
  const newBalance = prevBalance + pending.credits_granted;

  await admin
    .from("user_credits")
    .upsert(
      {
        user_id: user.id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  await admin.from("credit_transactions").insert({
    user_id: user.id,
    type: "charge",
    amount: pending.credits_granted,
    balance_after: newBalance,
    description: `${pending.amount_krw.toLocaleString("ko-KR")}원 충전`,
    ref_id: pending.id,
  });

  return NextResponse.json({
    ok: true,
    creditsGranted: pending.credits_granted,
    newBalance,
  });
}
