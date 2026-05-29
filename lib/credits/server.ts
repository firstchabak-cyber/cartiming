import { createClient } from "@/lib/supabase/server";
import {
  FREE_ANALYSIS_PER_MONTH,
  SOLD_SLOT_RECOVERY_MONTHS,
} from "./constants";

type SpendType =
  | "analysis_overage"
  | "add_vehicle"
  | "monitoring"
  | "precision_report";

export async function getBalance(userId: string): Promise<{
  balance: number;
  lifetime: boolean;
  permanentFreeSlots: number;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_credits")
    .select("balance, lifetime_member, permanent_free_slots")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    balance: data?.balance ?? 0,
    lifetime: data?.lifetime_member ?? false,
    permanentFreeSlots: data?.permanent_free_slots ?? 0,
  };
}

export async function spendCredits(args: {
  amount: number;
  type: SpendType;
  description?: string;
  refId?: string;
}): Promise<
  | { ok: true; newBalance: number }
  | { ok: false; reason: "insufficient_credits" | "unknown"; message: string }
> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("spend_credits", {
    p_amount: args.amount,
    p_type: args.type,
    p_description: args.description ?? null,
    p_ref_id: args.refId ?? null,
  });

  if (error) {
    const msg = error.message ?? "unknown";
    if (/insufficient_credits/i.test(msg)) {
      return {
        ok: false,
        reason: "insufficient_credits",
        message: "캐시가 부족합니다",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  return { ok: true, newBalance: data as number };
}

/**
 * 가입 후 누적(평생) 새 분석 횟수. 캐시 히트는 제외 (price_analyses 에 row 가 안 생기므로 자연스럽게 카운트 안 됨).
 * 무료 분석은 가입 시 평생 1회만 제공되므로 월 구분 없이 전체를 센다.
 */
export async function getMonthlyAnalysisCount(
  userId: string,
): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("price_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export async function getFreeAnalysisRemaining(
  userId: string,
): Promise<number> {
  const used = await getMonthlyAnalysisCount(userId);
  return Math.max(0, FREE_ANALYSIS_PER_MONTH - used);
}

/**
 * 무료 차량 슬롯 = 1 (기본) + (최근 N개월 이내 매각된 차량 수).
 * 활성 차량 수가 이 슬롯보다 적으면 새 차량 등록 무료.
 */
export async function getVehicleSlots(userId: string): Promise<{
  activeCount: number;
  freeSlots: number;
  canAddFree: boolean;
  permanentSlots: number;
  recoverySlots: number;
}> {
  const supabase = createClient();

  const { count: activeCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  // 3개월 이내 매각 (외부 매각 신고 포함) → 일시 복구 슬롯
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - SOLD_SLOT_RECOVERY_MONTHS);
  const { count: recentSoldCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sold")
    .gte("sold_at", cutoff.toISOString());

  // 카타이밍 통한 매각 완료 → 영구 슬롯 (user_credits.permanent_free_slots)
  const { data: creditRow } = await supabase
    .from("user_credits")
    .select("permanent_free_slots")
    .eq("user_id", userId)
    .maybeSingle();
  const permanentSlots = creditRow?.permanent_free_slots ?? 0;
  const recoverySlots = recentSoldCount ?? 0;

  const free = 1 + permanentSlots + recoverySlots;
  const active = activeCount ?? 0;
  return {
    activeCount: active,
    freeSlots: free,
    canAddFree: active < free,
    permanentSlots,
    recoverySlots,
  };
}
