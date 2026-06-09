"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type ChargePackage, totalCredits } from "@/lib/payments/packages";
import { BANK_ACCOUNT } from "@/lib/payments/bank";
import { DepositRequestItems } from "@/components/credits/DepositRequestItems";
import type { DepositRequest } from "@/lib/payments/depositStatus";

export function BankTransferCharge({
  packages,
}: {
  packages: ChargePackage[];
}) {
  const [selectedId, setSelectedId] = useState(packages[2]?.id ?? packages[0].id);
  const [depositor, setDepositor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requests, setRequests] = useState<DepositRequest[] | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = packages.find((p) => p.id === selectedId);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/deposit");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      // 목록 로드 실패는 조용히 무시
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 없으면 무시
    }
  };

  const submit = async () => {
    if (!selected) return;
    if (depositor.trim().length === 0) {
      setError("입금자명을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selected.id,
          depositorName: depositor.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "신청에 실패했습니다");
        return;
      }
      setDone(true);
      setDepositor("");
      await loadRequests();
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 입금 계좌 안내 */}
      <Card className="flex flex-col gap-2 bg-primary/5">
        <CardTitle className="text-sm">📥 입금 계좌</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold text-foreground">
              {BANK_ACCOUNT.bank} {BANK_ACCOUNT.number}
            </p>
            <p className="text-xs text-muted">예금주 {BANK_ACCOUNT.holder}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={copyAccount}>
            {copied ? "복사됨" : "계좌 복사"}
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          위 계좌로 <b>선택한 금액</b>을 입금하신 뒤 아래에서 신청해주세요. 운영자가
          입금을 확인하면 캐시를 지급해드려요(영업시간 내 처리).
        </p>
      </Card>

      {/* 패키지 선택 */}
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-sm">충전 금액 선택</CardTitle>
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

      {/* 입금자명 + 신청 */}
      <Card className="flex flex-col gap-3">
        <Input
          label="입금자명"
          value={depositor}
          onChange={(e) => {
            setDepositor(e.target.value);
            setDone(false);
          }}
          maxLength={40}
          placeholder="실제 입금하신 분 이름"
          hint="통장 입금 내역과 대조하니 정확히 입력해주세요"
          error={error ?? undefined}
        />
        {selected && (
          <div className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm">
            <span className="text-muted">입금할 금액</span>
            <span className="font-semibold text-foreground">
              {selected.amountKrw.toLocaleString("ko-KR")}원 →{" "}
              {totalCredits(selected).toLocaleString("ko-KR")} 캐시
            </span>
          </div>
        )}
        {done && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            ✅ 입금 신청이 접수됐어요. 위 계좌로 입금하시면 확인 후 캐시를
            지급해드립니다.
          </div>
        )}
        <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
          {busy ? "신청 중…" : "입금 신청하기"}
        </Button>
      </Card>

      {/* 내 충전 신청 내역 */}
      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">내 충전 신청 내역</CardTitle>
        {requests === null ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : (
          <DepositRequestItems requests={requests} />
        )}
      </Card>
    </div>
  );
}
