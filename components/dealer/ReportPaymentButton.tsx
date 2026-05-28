"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ReportPaymentButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dealer/fees/${transactionId}/report-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "bank_transfer" }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `처리 실패 (HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <>
        <Button
          type="button"
          fullWidth
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          ✅ 입금했어요
        </Button>
        {error && (
          <p className="text-[11px] text-danger">⚠️ {error}</p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warning bg-warning/10 p-3">
      <p className="text-sm font-semibold text-warning">정말 입금하셨나요?</p>
      <p className="text-xs text-muted">
        운영자가 통장 입금 내역을 확인 후 '입금 완료'로 변경합니다. 허위
        신고는 거래 제한 사유가 될 수 있습니다.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          취소
        </Button>
        <Button type="button" fullWidth onClick={report} disabled={busy}>
          {busy ? "처리 중..." : "확정"}
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-danger">⚠️ {error}</p>
      )}
    </div>
  );
}
