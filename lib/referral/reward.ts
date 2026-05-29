import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { REFERRAL_REWARD } from "@/lib/credits/constants";

export const REFERRAL_COOKIE = "cartiming_ref";

/**
 * 친구(referredId)가 첫 분석을 성공했을 때 호출.
 * 추천 쿠키가 있고 유효하면 추천인에게 1회 보상 캐시 지급.
 *
 * 안전장치:
 *  - referred_id UNIQUE → 한 친구당 평생 1회만 (재호출해도 중복 지급 X)
 *  - 본인이 본인 추천 차단 (DB CHECK + 코드 체크)
 *  - 추천인이 실제 존재하는 유저일 때만
 *  - 실패해도 분석 결과에는 영향 없음 (조용히 무시)
 */
export async function tryRewardReferral(referredId: string): Promise<void> {
  try {
    const ref = cookies().get(REFERRAL_COOKIE)?.value;
    if (!ref || ref === referredId) return;

    const admin = createAdminClient();

    // 이미 이 친구가 추천 처리된 적 있으면 skip
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referred_id", referredId)
      .maybeSingle();
    if (existing) return;

    // 추천인이 실제 존재하는 유저인지 확인
    const { data: referrer } = await admin
      .from("user_credits")
      .select("user_id, balance")
      .eq("user_id", ref)
      .maybeSingle();
    if (!referrer) return;

    // referrals 기록 (referred_id UNIQUE 가 동시성/중복 방지)
    const { error: insErr } = await admin.from("referrals").insert({
      referrer_id: ref,
      referred_id: referredId,
      status: "rewarded",
      reward_amount: REFERRAL_REWARD,
      rewarded_at: new Date().toISOString(),
    });
    if (insErr) return; // unique 충돌 등 → 이미 처리됨

    // 추천인에게 캐시 지급
    const newBalance = (referrer.balance ?? 0) + REFERRAL_REWARD;
    await admin
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", ref);

    await admin.from("credit_transactions").insert({
      user_id: ref,
      type: "referral",
      amount: REFERRAL_REWARD,
      balance_after: newBalance,
      description: "친구 초대 보상 (친구 첫 분석 완료)",
    });

    // 추천인에게 알림
    await admin.from("notifications").insert({
      user_id: ref,
      type: "system",
      title: `🎉 친구 초대 보상 ${REFERRAL_REWARD.toLocaleString("ko-KR")} 캐시 지급!`,
      message:
        "회원님이 초대한 친구가 첫 시세 분석을 완료해서 보상 캐시를 드렸어요. 감사합니다!",
    });
  } catch {
    // 보상 실패는 분석 흐름에 영향 주지 않음
  }
}
