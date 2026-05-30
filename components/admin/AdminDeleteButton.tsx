"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 관리자 삭제 버튼. 삭제 사유를 입력해야 실행되며, 사유는 삭제 로그에 영구 기록됨.
 * endpoint: DELETE 호출할 주소 (body 로 { reason } 전송)
 * redirectTo: 삭제 후 이동할 경로 (없으면 router.refresh)
 */
export function AdminDeleteButton({
  endpoint,
  label,
  redirectTo,
}: {
  endpoint: string;
  label: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remove = async () => {
    if (!reason.trim()) {
      setErr("삭제 사유를 입력해주세요");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
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
        삭제 사유를 입력하면 기록으로 남아요 (나중에 왜 삭제했는지 확인 가능).
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="예) 중복 가입 계정 / 테스트 데이터 / 고객 요청으로 탈퇴"
        className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-danger focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy || !reason.trim()}
          className="flex-1 rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "삭제 중..." : "사유 기록하고 삭제"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setErr(null);
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
