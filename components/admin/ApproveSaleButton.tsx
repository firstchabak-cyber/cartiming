"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ApproveSaleButton({ saleRequestId }: { saleRequestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    if (
      !confirm(
        "이 매각 신청을 승인하시겠어요?\n→ 딜러들에게 매물이 노출되고 48시간 입찰 타이머가 시작됩니다.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sales/${saleRequestId}/approve`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `승인 실패 (HTTP ${res.status})`);
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
      <Button type="button" onClick={approve} disabled={busy} size="lg">
        <CheckCircle className="h-4 w-4" />
        {busy ? "승인 처리 중..." : "승인 — 입찰 시작 (48시간)"}
      </Button>
      {error && <p className="text-xs text-danger">⚠️ {error}</p>}
    </div>
  );
}
