"use client";

import { useEffect } from "react";

/**
 * 알림 목록 페이지가 실제로 열릴 때(클라이언트 마운트) 모든 알림을 읽음 처리한다.
 * - 서버 컴포넌트에서 처리하면 Next.js 프리페치만으로도 읽음 처리돼버리므로 클라이언트에서 수행.
 * - 처리 후 종(bell) 배지가 즉시 0이 되도록 window 이벤트를 쏜다.
 */
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (!hasUnread) return;
    let done = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        if (res.ok && !done) {
          window.dispatchEvent(new Event("notifications:changed"));
        }
      } catch {
        // 무시 — 다음 방문/실시간 구독에서 갱신됨
      }
    })();
    return () => {
      done = true;
    };
  }, [hasUnread]);

  return null;
}
