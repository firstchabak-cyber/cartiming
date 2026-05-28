"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "마감됨";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remainH = h % 24;
    return `${days}일 ${remainH}시간 ${m}분`;
  }
  return `${h.toString().padStart(2, "0")}시간 ${m.toString().padStart(2, "0")}분 ${s.toString().padStart(2, "0")}초`;
}

export function BiddingCountdown({ closesAt }: { closesAt: string }) {
  const closeTime = new Date(closesAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = closeTime - now;
  const isUrgent = remaining > 0 && remaining < 6 * 3600 * 1000; // 6시간 미만
  const isClosed = remaining <= 0;

  return (
    <div
      className={
        isClosed
          ? "rounded-lg border border-muted bg-muted/10 px-3 py-2"
          : isUrgent
            ? "rounded-lg border border-danger bg-danger/10 px-3 py-2"
            : "rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
      }
    >
      <p className="text-[11px] text-muted">입찰 마감까지</p>
      <p
        className={`font-mono text-base font-bold ${
          isClosed ? "text-muted" : isUrgent ? "text-danger" : "text-primary"
        }`}
      >
        {format(remaining)}
      </p>
    </div>
  );
}
