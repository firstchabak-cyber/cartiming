"use client";

import Link from "next/link";
import { BellRing } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";

/**
 * 자동 매각 감시는 이제 '차량별'로 켠다(차량 상세 화면).
 * 마이페이지에서는 안내 + 내 차고로 보내는 역할만.
 */
export function NotificationSettings() {
  const cost = NOTIFICATION_ENABLE_COST.toLocaleString("ko-KR");
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <BellRing className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <CardTitle className="text-sm">자동 매각 감시</CardTitle>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            켜두면 <b>매월 자동으로 내 차 시세를 분석</b>해, 매각 적기·시세 변동이
            생기면 이메일로 <b>먼저</b> 알려드려요. <b>차량 1대당 {cost}캐시</b>(최초
            1회)로, 감시할 차량을 골라서 켤 수 있어요.
          </p>
        </div>
      </div>
      <Link href="/garage">
        <Button variant="outline" size="sm" fullWidth>
          내 차고에서 차량별로 켜기 →
        </Button>
      </Link>
    </Card>
  );
}
