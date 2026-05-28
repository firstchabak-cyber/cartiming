"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  type ChargePackage,
  totalCredits,
} from "@/lib/payments/packages";

type Props = {
  packages: ChargePackage[];
  tossClientKey: string;
};

export function ChargeClient({ packages, tossClientKey }: Props) {
  const [selectedId, setSelectedId] = useState<string>(packages[2].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = packages.find((p) => p.id === selectedId);

  const handleCharge = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      // 1) 서버에 주문 생성 요청
      const orderRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderData?.error ?? "결제 요청 생성 실패");
        return;
      }

      // 2) 토스페이먼츠 위젯 호출
      const toss = await loadTossPayments(tossClientKey);
      await toss.requestPayment("카드", {
        amount: orderData.amountKrw,
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      // 토스가 페이지를 이동시킴 — 여기 이후 코드는 안 실행됨
    } catch (err) {
      // 사용자가 결제창 닫음 등
      const msg = err instanceof Error ? err.message : "결제 취소";
      if (/cancel/i.test(msg) || /닫/i.test(msg)) {
        setError("결제가 취소되었습니다");
      } else {
        setError(`결제 실패: ${msg}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">패키지 선택</p>
        <div className="flex flex-col gap-2">
          {packages.map((p) => {
            const active = p.id === selectedId;
            const total = totalCredits(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={
                  active
                    ? "flex items-center justify-between rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-left"
                    : "flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left hover:bg-surface"
                }
              >
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {p.amountKrw.toLocaleString("ko-KR")}원
                  </p>
                  <p className="text-xs text-muted">
                    {total.toLocaleString("ko-KR")} 캐시
                    {p.bonusCredits > 0 && (
                      <span className="ml-1 font-semibold text-success">
                        {p.bonusLabel} 보너스 +
                        {p.bonusCredits.toLocaleString("ko-KR")}
                      </span>
                    )}
                  </p>
                </div>
                {active && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    선택
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">결제 금액</span>
            <span className="font-semibold text-foreground">
              {selected.amountKrw.toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">받는 캐시</span>
            <span className="font-semibold text-foreground">
              {totalCredits(selected).toLocaleString("ko-KR")} 캐시
            </span>
          </div>
        </Card>
      )}

      <Button
        type="button"
        size="lg"
        fullWidth
        onClick={handleCharge}
        disabled={busy || !selected}
      >
        {busy ? "결제 진행 중..." : "결제하기"}
      </Button>

      <p className="text-[11px] text-muted">
        결제 진행 시 카타이밍의{" "}
        <a href="/terms" className="text-primary underline" target="_blank">
          이용약관
        </a>{" "}
        및{" "}
        <a href="/privacy" className="text-primary underline" target="_blank">
          개인정보처리방침
        </a>{" "}
        에 동의한 것으로 간주됩니다.
      </p>
    </div>
  );
}
