"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  uncharged: [
    { label: "청구하기", next: "charged" },
    { label: "면제", next: "waived" },
  ],
  charged: [
    { label: "입금 확인", next: "paid" },
    { label: "다시 미청구", next: "uncharged" },
  ],
  paid: [{ label: "취소", next: "charged" }],
  waived: [{ label: "취소", next: "uncharged" }],
};

export function FeeStatusButton({
  transactionId,
  currentStatus,
}: {
  transactionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "변경 실패");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const options = TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.next}
            type="button"
            onClick={() => update(o.next)}
            disabled={busy}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-surface disabled:opacity-50"
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  );
}
