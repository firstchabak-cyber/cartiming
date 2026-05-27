import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBalance,
  getFreeAnalysisRemaining,
  getVehicleSlots,
} from "@/lib/credits/server";
import { CREDIT_COSTS, FREE_ANALYSIS_PER_MONTH } from "@/lib/credits/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const [{ balance, lifetime }, freeRemaining, slots] = await Promise.all([
    getBalance(user.id),
    getFreeAnalysisRemaining(user.id),
    getVehicleSlots(user.id),
  ]);

  const { data: txns } = await supabase
    .from("credit_transactions")
    .select("id, type, amount, balance_after, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    balance,
    lifetime,
    free_analysis: {
      remaining: freeRemaining,
      total_per_month: FREE_ANALYSIS_PER_MONTH,
    },
    vehicle_slots: slots,
    costs: CREDIT_COSTS,
    recent_transactions: txns ?? [],
  });
}
