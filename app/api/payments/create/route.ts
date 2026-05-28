import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { findPackage, totalCredits } from "@/lib/payments/packages";

export const dynamic = "force-dynamic";

const schema = z.object({
  packageId: z.string().min(1),
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
    return NextResponse.json({ error: "packageId 가 필요합니다" }, { status: 400 });
  }

  const pkg = findPackage(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "잘못된 패키지" }, { status: 400 });
  }

  // orderId 생성 (영문+숫자 16자 이상, 토스 요구사항: 6~64자)
  const orderId = `ct_${Date.now()}_${randomBytes(6).toString("hex")}`;

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    amount_krw: pkg.amountKrw,
    credits_granted: totalCredits(pkg),
    provider: "toss",
    provider_order_id: orderId,
    status: "pending",
  });

  if (error) {
    console.error("payment create failed", error);
    return NextResponse.json(
      { error: "결제 요청 생성 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    orderId,
    orderName: `카타이밍 ${pkg.amountKrw.toLocaleString("ko-KR")}원 충전`,
    amountKrw: pkg.amountKrw,
    creditsToGrant: totalCredits(pkg),
  });
}
