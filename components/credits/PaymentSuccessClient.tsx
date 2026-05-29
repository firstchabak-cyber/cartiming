"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type State =
  | { kind: "loading" }
  | { kind: "ok"; creditsGranted: number; newBalance: number }
  | { kind: "error"; message: string };

export function PaymentSuccessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setState({
        kind: "error",
        message: "결제 정보가 부족합니다 (paymentKey/orderId/amount 누락)",
      });
      return;
    }

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setState({
            kind: "error",
            message: data?.error ?? "결제 승인 실패",
          });
          return;
        }
        setState({
          kind: "ok",
          creditsGranted: data.creditsGranted,
          newBalance: data.newBalance ?? 0,
        });
      })
      .catch((err) => {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "네트워크 오류",
        });
      });
  }, [params]);

  if (state.kind === "loading") {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-2xl">⏳</p>
        <CardTitle>결제 승인 중...</CardTitle>
        <CardDescription>잠시만 기다려 주세요</CardDescription>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-3xl">⚠️</p>
        <CardTitle>결제 처리 실패</CardTitle>
        <CardDescription className="text-danger">
          {state.message}
        </CardDescription>
        <p className="text-xs text-muted">
          금액이 결제되었지만 적립이 안 된 경우 help@cartiming.app 으로
          문의해 주세요. 주문 번호와 함께 알려주시면 빠르게 처리됩니다.
        </p>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" onClick={() => router.push("/credits")}>
            캐시 페이지로
          </Button>
          <Button onClick={() => router.push("/credits/charge")}>
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-4xl">✅</p>
      <CardTitle>충전 완료!</CardTitle>
      <p className="text-lg font-bold text-success">
        +{state.creditsGranted.toLocaleString("ko-KR")} 캐시
      </p>
      <p className="text-sm text-muted">
        현재 잔액 {state.newBalance.toLocaleString("ko-KR")} 캐시
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={() => router.push("/credits")}>
          캐시 페이지로
        </Button>
        <Button onClick={() => router.push("/analysis")}>
          시세 분석하기
        </Button>
      </div>
    </Card>
  );
}
