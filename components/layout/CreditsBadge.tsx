"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Coins } from "lucide-react";

type CreditsInfo = {
  balance: number;
  lifetime: boolean;
};

export function CreditsBadge() {
  const [info, setInfo] = useState<CreditsInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setInfo({ balance: d.balance ?? 0, lifetime: d.lifetime ?? false });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  return (
    <Link
      href="/credits"
      className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold text-warning hover:bg-warning/25"
      aria-label="캐시 잔액"
    >
      <Coins className="h-3.5 w-3.5" />
      {info.lifetime
        ? "평생"
        : `${info.balance.toLocaleString("ko-KR")}`}
    </Link>
  );
}
