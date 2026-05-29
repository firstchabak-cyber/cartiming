"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WantedApproveButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/wanted/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "승인 실패");
        return;
      }
      setMsg(`승인 완료 · 차주 ${data.notified ?? 0}명에게 알림 발송`);
      router.refresh();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    const reason = prompt("반려 사유 (선택):") ?? undefined;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/wanted/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error ?? "반려 실패");
        return;
      }
      router.refresh();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={busy}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          승인 + 알림 발송
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={busy}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
        >
          반려
        </button>
      </div>
      {msg && <p className="text-[11px] text-success">{msg}</p>}
    </div>
  );
}
