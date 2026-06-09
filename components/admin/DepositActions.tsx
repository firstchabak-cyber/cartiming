"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DepositActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const call = async (path: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "처리에 실패했습니다");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          placeholder="반려 사유 (예: 입금 내역 없음)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => call(`/api/admin/deposits/${id}/reject`, { reason })}
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
        <Button
          size="sm"
          disabled={busy}
          onClick={() => call(`/api/admin/deposits/${id}/approve`)}
        >
          {busy ? "처리 중…" : "입금확인·캐시지급"}
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
