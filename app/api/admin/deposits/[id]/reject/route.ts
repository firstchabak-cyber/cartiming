import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출될 수도 있음
  }
  const parsed = schema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason?.trim() : undefined;

  const admin = createAdminClient();

  // pending → rejected 조건부 갱신 (이미 처리된 건 막음). 캐시는 지급하지 않음.
  const { data: updated } = await admin
    .from("deposit_requests")
    .update({
      status: "rejected",
      admin_note: reason || "입금 확인 불가",
      processed_by: user.email,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .select("user_id, amount_krw")
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      { error: "이미 처리되었거나 존재하지 않는 신청입니다" },
      { status: 409 },
    );
  }

  await createAndDispatch(admin, {
    userId: updated.user_id as string,
    type: "system",
    title: "캐시 충전 신청이 반려되었어요",
    message:
      `${(updated.amount_krw as number).toLocaleString("ko-KR")}원 충전 신청이 반려되었습니다.\n` +
      `사유: ${reason || "입금 확인 불가"}\n` +
      `입금하셨는데 반려되었다면 고객센터(help@cartiming.app)로 문의해주세요.`,
    email: true,
  });

  return NextResponse.json({ ok: true });
}
