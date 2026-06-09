import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";
import { REVIEW_REWARD } from "@/lib/credits/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject", "hide"]),
  reason: z.string().trim().max(200).optional(),
});

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // ── 반려 ──
  if (parsed.data.action === "reject") {
    const { data: updated } = await admin
      .from("analysis_reviews")
      .update({
        status: "rejected",
        admin_note: parsed.data.reason || "게시 기준 미충족",
        processed_by: user.email,
        processed_at: now,
      })
      .eq("id", params.id)
      .eq("status", "pending")
      .select("user_id")
      .maybeSingle();
    if (!updated)
      return NextResponse.json(
        { error: "이미 처리되었거나 없는 후기입니다" },
        { status: 409 },
      );
    await createAndDispatch(admin, {
      userId: updated.user_id as string,
      type: "system",
      title: "작성하신 시세 후기가 반려되었어요",
      message: `사유: ${parsed.data.reason || "게시 기준 미충족"}\n개인정보·부적절한 내용을 빼고 다시 작성해주세요.`,
      email: false,
    });
    return NextResponse.json({ ok: true });
  }

  // ── 숨김 (이미 공개된 글 내리기) ──
  if (parsed.data.action === "hide") {
    const { data: updated } = await admin
      .from("analysis_reviews")
      .update({ status: "hidden", processed_by: user.email, processed_at: now })
      .eq("id", params.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();
    if (!updated)
      return NextResponse.json(
        { error: "공개 상태인 후기만 숨길 수 있어요" },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  }

  // ── 승인 (pending → approved) ──
  const { data: review } = await admin
    .from("analysis_reviews")
    .update({
      status: "approved",
      processed_by: user.email,
      processed_at: now,
    })
    .eq("id", params.id)
    .eq("status", "pending")
    .select("user_id, vehicle_id, rewarded")
    .maybeSingle();
  if (!review)
    return NextResponse.json(
      { error: "이미 처리되었거나 없는 후기입니다" },
      { status: 409 },
    );

  const targetUserId = review.user_id as string;
  const vehicleId = review.vehicle_id as string;

  // 차량 1대당 200캐시 1회 — 이 차량으로 이미 보상한 적 있으면 지급 안 함
  const { count: rewardedCount } = await admin
    .from("analysis_reviews")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("rewarded", true);

  let rewarded = false;
  if ((rewardedCount ?? 0) === 0) {
    const { data: existing } = await admin
      .from("user_credits")
      .select("balance")
      .eq("user_id", targetUserId)
      .maybeSingle();
    const prev = existing?.balance ?? 0;
    const next = prev + REVIEW_REWARD;

    await admin.from("user_credits").upsert(
      { user_id: targetUserId, balance: next, updated_at: now },
      { onConflict: "user_id" },
    );
    await admin.from("credit_transactions").insert({
      user_id: targetUserId,
      type: "review",
      amount: REVIEW_REWARD,
      balance_after: next,
      description: "시세분석 후기 작성 보상",
      ref_id: params.id,
    });
    await admin
      .from("analysis_reviews")
      .update({ rewarded: true })
      .eq("id", params.id);
    rewarded = true;

    await createAndDispatch(admin, {
      userId: targetUserId,
      type: "system",
      title: `🎁 후기 보상 ${REVIEW_REWARD} 캐시 지급`,
      message:
        `작성하신 시세 후기가 게시판에 공개되었어요. 감사의 의미로 ${REVIEW_REWARD} 캐시를 지급했어요.\n` +
        `현재 잔액: ${next.toLocaleString("ko-KR")} 캐시`,
      email: false,
    });
  } else {
    // 보상은 이미 받은 차량이지만, 공개되었음을 알림
    await createAndDispatch(admin, {
      userId: targetUserId,
      type: "system",
      title: "시세 후기가 게시판에 공개되었어요",
      message: "작성해주신 후기가 승인되어 게시판에 공개되었어요. 감사합니다!",
      email: false,
    });
  }

  return NextResponse.json({ ok: true, rewarded });
}
