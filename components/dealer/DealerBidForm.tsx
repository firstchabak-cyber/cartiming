"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function DealerBidForm({ saleRequestId }: { saleRequestId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cleaned = amount.replace(/[^0-9]/g, "");
    const num = Number(cleaned);
    if (!num || num <= 0) {
      setError("입찰가를 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleRequestId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidAmount: num,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `입찰 실패 (HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">입찰가 제출</p>
      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}
      <Input
        label="입찰가 (원)"
        inputMode="numeric"
        value={
          amount.replace(/[^0-9]/g, "")
            ? new Intl.NumberFormat("ko-KR").format(
                Number(amount.replace(/[^0-9]/g, "")),
              )
            : ""
        }
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="예) 29,820,000"
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">비고 (선택)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="예) 명의이전 즉시 가능, 인수 위치 강남"
          className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "제출 중..." : "입찰 제출"}
      </Button>
      <p className="text-[11px] text-muted">
        입찰은 차주가 선택할 때까지 유효합니다. 선정되면 차주 연락처가 자동 전달됩니다.
        매각 성사 시 매각가의 1.5% 수수료가 부과됩니다.
      </p>
    </Card>
  );
}
