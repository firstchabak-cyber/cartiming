"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ReviewActions({
  id,
  status,
}: {
  id: string;
  status: "pending" | "approved";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const call = async (action: string, reasonText?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reasonText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "처리에 실패했어요");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (status === "approved") {
    return (
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => call("hide")}
        >
          숨기기
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          placeholder="반려 사유 (예: 개인정보 포함)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => call("reject", reason)}
          >
            반려 확정
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
          >
            취소
          </Button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => call("approve")}>
          {busy ? "처리 중…" : "승인·공개"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setRejecting(true)}
        >
          반려
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
