"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WantedCloseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClose = async () => {
    if (!confirm("이 구매요청을 마감할까요? 게시판에서 내려갑니다.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dealer/wanted/${id}/close`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClose}
      disabled={busy}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-surface disabled:opacity-50"
    >
      {busy ? "처리 중..." : "마감하기"}
    </button>
  );
}
