"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SelectBidButton({
  saleRequestId,
  bidId,
  dealerName,
  bidAmount,
}: {
  saleRequestId: string;
  bidId: string;
  dealerName: string;
  bidAmount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = async () => {
    if (
      !confirm(
        `${dealerName} (${bidAmount.toLocaleString("ko-KR")}원) 을 선택하시겠어요?\n선택하면 양측 연락처가 교환되고 변경할 수 없습니다.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleRequestId}/select-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `선택 실패 (HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" onClick={select} disabled={busy} fullWidth>
        {busy ? "처리 중..." : "이 딜러 선택"}
      </Button>
      {error && <p className="text-xs text-danger">⚠️ {error}</p>}
    </div>
  );
}
