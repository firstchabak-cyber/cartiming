/**
 * 관리자 매출 집계.
 *
 * 두 종류의 매출을 한곳에 모은다:
 *  1) 캐시 매출 (B2C) — payments 테이블, status='paid' 기준, 인식 시점 = paid_at
 *  2) 매각 수수료 매출 (B2B) — sale_transactions, fee_status='paid' 기준, 인식 시점 = fee_paid_at
 *
 * 월 구분은 한국 시간(KST, UTC+9) 기준으로 계산해 세무 신고 월과 어긋나지 않게 한다.
 */

import { createAdminClient } from "@/lib/supabase/server";

export type MonthlyRevenue = {
  month: string; // "2026-05"
  cashRevenue: number;
  cashCount: number;
  feeRevenue: number;
  feeCount: number;
  total: number;
};

export type RevenueSummary = {
  /** 실현 매출 (입금 완료 기준) */
  cashRevenueTotal: number;
  cashCountTotal: number;
  feeRevenueTotal: number;
  feeCountTotal: number;
  grandTotal: number;
  /** 미수금 — 청구했으나 아직 입금 안 된 수수료 */
  feeReceivable: number;
  feeReceivableCount: number;
  /** 이번 달 매출 (없으면 0짜리 행) */
  thisMonth: MonthlyRevenue;
  /** 월별 매출 (최신월 우선) */
  monthly: MonthlyRevenue[];
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO 시각 문자열을 KST 기준 "YYYY-MM" 으로 변환 */
function monthKeyKST(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 7);
}

/** 현재 KST 기준 "YYYY-MM" */
function currentMonthKST(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 7);
}

function emptyMonth(month: string): MonthlyRevenue {
  return {
    month,
    cashRevenue: 0,
    cashCount: 0,
    feeRevenue: 0,
    feeCount: 0,
    total: 0,
  };
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const admin = createAdminClient();

  const [paymentsRes, feesRes] = await Promise.all([
    admin
      .from("payments")
      .select("amount_krw, paid_at, status")
      .eq("status", "paid"),
    admin
      .from("sale_transactions")
      .select("fee_amount, fee_status, fee_paid_at")
      .eq("channel", "cartiming"),
  ]);

  const payments = (paymentsRes.data ?? []) as Array<{
    amount_krw: number;
    paid_at: string | null;
  }>;
  const fees = (feesRes.data ?? []) as Array<{
    fee_amount: number | null;
    fee_status: string | null;
    fee_paid_at: string | null;
  }>;

  const map = new Map<string, MonthlyRevenue>();
  const ensure = (m: string): MonthlyRevenue => {
    let row = map.get(m);
    if (!row) {
      row = emptyMonth(m);
      map.set(m, row);
    }
    return row;
  };

  // 1) 캐시 매출
  let cashRevenueTotal = 0;
  let cashCountTotal = 0;
  for (const p of payments) {
    if (!p.paid_at) continue;
    const row = ensure(monthKeyKST(p.paid_at));
    row.cashRevenue += p.amount_krw;
    row.cashCount += 1;
    row.total += p.amount_krw;
    cashRevenueTotal += p.amount_krw;
    cashCountTotal += 1;
  }

  // 2) 매각 수수료 매출 + 미수금
  let feeRevenueTotal = 0;
  let feeCountTotal = 0;
  let feeReceivable = 0;
  let feeReceivableCount = 0;
  for (const f of fees) {
    const amt = f.fee_amount ?? 0;
    if (f.fee_status === "paid" && f.fee_paid_at) {
      const row = ensure(monthKeyKST(f.fee_paid_at));
      row.feeRevenue += amt;
      row.feeCount += 1;
      row.total += amt;
      feeRevenueTotal += amt;
      feeCountTotal += 1;
    } else if (f.fee_status === "charged") {
      feeReceivable += amt;
      feeReceivableCount += 1;
    }
  }

  const monthly = Array.from(map.values()).sort((a, b) =>
    a.month < b.month ? 1 : -1,
  );

  const thisMonthKey = currentMonthKST();
  const thisMonth =
    monthly.find((m) => m.month === thisMonthKey) ?? emptyMonth(thisMonthKey);

  return {
    cashRevenueTotal,
    cashCountTotal,
    feeRevenueTotal,
    feeCountTotal,
    grandTotal: cashRevenueTotal + feeRevenueTotal,
    feeReceivable,
    feeReceivableCount,
    thisMonth,
    monthly,
  };
}
