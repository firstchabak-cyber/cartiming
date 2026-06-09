"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellRing, BellOff } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";

type Props = {
  vehicleId: string;
  initialOn: boolean;
  initialPaid: boolean;
};

export function AutoWatchToggle({ vehicleId, initialOn, initialPaid }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [paid, setPaid] = useState(initialPaid);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needCredit, setNeedCredit] = useState(false);

  const cost = NOTIFICATION_ENABLE_COST.toLocaleString("ko-KR");

  const toggle = async (next: boolean) => {
    setError(null);
    setNeedCredit(false);

    // 최초 켜기(미결제)면 결제 확인
    if (next && !paid) {
      const ok = window.confirm(
        `이 차량의 자동 매각 감시를 켜면 ${cost}캐시가 1회 차감됩니다.\n(이 차량은 한 번만 차감되고, 이후 끄고 켜도 추가 차감 없어요)\n\n계속할까요?`,
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/auto-watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402) {
        setNeedCredit(true);
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "처리에 실패했어요");
        return;
      }
      setOn(next);
      if (next) setPaid(true);
      router.refresh();
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={
        on
          ? "flex flex-col gap-2 border-primary/40 bg-primary/5"
          : "flex flex-col gap-2"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {on ? (
            <BellRing className="mt-0.5 h-5 w-5 text-primary" />
          ) : (
            <BellOff className="mt-0.5 h-5 w-5 text-muted" />
          )}
          <div>
            <CardTitle className="text-sm">자동 매각 감시</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted">
              {on
                ? "매월 자동 분석 중 · 매각 적기·시세 변동 시 이메일로 먼저 알림"
                : `켜면 매월 자동으로 이 차 시세를 분석해 팔 때를 먼저 알려드려요${paid ? "" : ` (최초 ${cost}캐시)`}`}
            </p>
          </div>
        </div>
      </div>

      {on ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => toggle(false)}
        >
          {busy ? "처리 중…" : "감시 끄기"}
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={() => toggle(true)}>
          {busy
            ? "처리 중…"
            : paid
              ? "감시 켜기"
              : `감시 켜기 (${cost}캐시)`}
        </Button>
      )}

      {needCredit && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          캐시가 부족해요. 자동 감시를 켜려면 {cost}캐시가 필요합니다.{" "}
          <Link href="/credits/charge" className="font-semibold underline">
            충전하기 →
          </Link>
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
