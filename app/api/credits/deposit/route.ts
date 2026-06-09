import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findPackage, totalCredits } from "@/lib/payments/packages";

export const dynamic = "force-dynamic";

const schema = z.object({
  packageId: z.string().trim().min(1),
  depositorName: z.string().trim().min(1, "입금자명을 입력해주세요").max(40),
});

export async function POST(request: Request) {
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.depositorName?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }

  // 금액·지급 캐시는 클라이언트 값을 믿지 않고 서버가 패키지 id로 산정 (위조 방지).
  const pkg = findPackage(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json(
      { error: "올바르지 않은 충전 상품입니다" },
      { status: 400 },
    );
  }

  // 처리 대기 중인 신청이 너무 많이 쌓이지 않게 — 미처리 신청 5건 제한.
  const { count: pendingCount } = await supabase
    .from("deposit_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: "확인 대기 중인 신청이 많습니다. 입금 확인 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { error } = await supabase.from("deposit_requests").insert({
    user_id: user.id,
    package_id: pkg.id,
    amount_krw: pkg.amountKrw,
    credits: totalCredits(pkg),
    depositor_name: parsed.data.depositorName,
    status: "pending",
  });
  if (error) {
    return NextResponse.json(
      { error: "신청 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { data } = await supabase
    .from("deposit_requests")
    .select(
      "id, package_id, amount_krw, credits, depositor_name, status, admin_note, created_at, processed_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ requests: data ?? [] });
}
