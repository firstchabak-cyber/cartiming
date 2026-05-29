import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 알림 활성화 비용을 이미 1회 차감했는지 여부 (재활성화는 무료) */
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
    .select("notif_reward_granted, lifetime_member")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    alreadyPaid:
      data?.notif_reward_granted === true || data?.lifetime_member === true,
  });
}
