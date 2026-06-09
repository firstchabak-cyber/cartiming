"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { DepositRequestItems } from "@/components/credits/DepositRequestItems";
import type { DepositRequest } from "@/lib/payments/depositStatus";

/** 마이페이지용 — 캐시 충전(입금) 신청 상태. 신청 내역이 있을 때만 표시. */
export function DepositStatusList() {
  const [requests, setRequests] = useState<DepositRequest[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/credits/deposit");
        if (res.ok && alive) {
          const data = await res.json();
          setRequests(data.requests ?? []);
        }
      } catch {
        // 무시
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 신청 내역이 없으면 카드 자체를 숨김 (충전 안 한 사용자에겐 안 보이게)
  if (!requests || requests.length === 0) return null;

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle className="text-sm">캐시 충전 신청 상태</CardTitle>
      <DepositRequestItems requests={requests} />
    </Card>
  );
}
