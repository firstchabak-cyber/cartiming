"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 관리자 삭제 버튼. 확인 문구를 정확히 입력해야 실제 삭제 (오삭제 방지).
 * endpoint: DELETE 호출할 주소
 * redirectTo: 삭제 후 이동할 경로 (없으면 router.refresh)
 */
export function AdminDeleteButton({
  endpoint,
  label,
  confirmWord,
  redirectTo,
}: {
  endpoint: string;
  label: string;
  confirmWord: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "삭제 실패");
        return;
      }
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        router.refresh();
        setOpen(false);
      }
    } catch {
      setErr("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-semibold text-danger hover:underline"
      >
        🗑 {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-xs font-semibold text-danger">
        ⚠️ {label} — 되돌릴 수 없어요!
      </p>
      <p className="text-[11px] text-muted">
        삭제하려면 아래에 <b>{confirmWord}</b> 를 입력하세요.
      </p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={confirmWord}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:border-danger focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy || input.trim() !== confirmWord}
          className="flex-1 rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "삭제 중..." : "영구 삭제"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setInput("");
          }}
          disabled={busy}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-surface"
        >
          취소
        </button>
      </div>
      {err && <p className="text-[11px] text-danger">{err}</p>}
    </div>
  );
}
