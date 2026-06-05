"use client";

import type { MonthlyRevenue } from "@/lib/admin/revenue";

/**
 * 월별 매출을 CSV(엑셀)로 내려받는 버튼. 세무사 전달·월정산용.
 * 한글 깨짐 방지를 위해 UTF-8 BOM 을 앞에 붙인다.
 */
export function RevenueCsvButton({ monthly }: { monthly: MonthlyRevenue[] }) {
  const download = () => {
    const header = [
      "월",
      "캐시매출(원)",
      "캐시건수",
      "매각수수료(원)",
      "수수료건수",
      "합계(원)",
    ];
    const rows = monthly.map((m) => [
      m.month,
      m.cashRevenue,
      m.cashCount,
      m.feeRevenue,
      m.feeCount,
      m.total,
    ]);
    const totalCash = monthly.reduce((s, m) => s + m.cashRevenue, 0);
    const totalFee = monthly.reduce((s, m) => s + m.feeRevenue, 0);
    const totalCashCnt = monthly.reduce((s, m) => s + m.cashCount, 0);
    const totalFeeCnt = monthly.reduce((s, m) => s + m.feeCount, 0);
    rows.push([
      "합계",
      totalCash,
      totalCashCnt,
      totalFee,
      totalFeeCnt,
      totalCash + totalFee,
    ]);

    const csv =
      "﻿" +
      [header, ...rows].map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `카타임_월별매출.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={monthly.length === 0}
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50"
    >
      📥 엑셀(CSV) 내보내기
    </button>
  );
}
