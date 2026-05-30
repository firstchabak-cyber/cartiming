"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { CREDITS_CHANGED_EVENT } from "@/lib/credits/events";

export function CreditsBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [lifetime, setLifetime] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/credits", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setBalance(data.balance ?? 0);
        setLifetime(data.lifetime ?? false);
      } catch {
        // 무시
      }
    }
    load();

    // 캐시 변동 이벤트 발생 시 즉시 재조회 (차감 후 바로 반영)
    const onChanged = () => load();
    const onFocus = () => load();
    window.addEventListener(CREDITS_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener(CREDITS_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/credits"
      className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-sm font-semibold text-warning"
    >
      <Coins className="h-4 w-4" />
      <span>
        {lifetime ? "평생회원" : `${balance.toLocaleString("ko-KR")} 캐시`}
      </span>
    </Link>
  );
}
