"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * 승인된 딜러를 일시 정지(인증 취소)한다. 삭제와 달리 데이터는 보존되고
 * 언제든 다시 승인할 수 있다. PATCH /api/admin/dealers/<id> { verified: false }
 */
export function DealerSuspendButton({ dealerId }: { dealerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suspend = async () => {
    if (
      !confirm(
        "이 딜러의 인증을 정지하시겠어요? 입찰이 제한되며, 나중에 다시 승인할 수 있어요.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dealers/${dealerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "정지 실패");
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
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={suspend}
        disabled={busy}
        fullWidth
      >
        {busy ? "처리 중..." : "⏸ 인증 정지"}
      </Button>
      {error && <p className="text-xs text-danger">⚠️ {error}</p>}
    </div>
  );
}
