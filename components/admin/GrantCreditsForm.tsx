"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function GrantCreditsForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    const num = Number(amount.replace(/[^0-9-]/g, ""));
    if (!num) {
      setError("금액을 입력해주세요 (음수면 회수)");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: num,
          reason: reason.trim() || (num > 0 ? "관리자 지급" : "관리자 회수"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "처리 실패");
        return;
      }
      setSuccess(
        `${num > 0 ? "지급" : "회수"} 완료. 새 잔액 ${data.newBalance?.toLocaleString("ko-KR") ?? "-"} 캐시`,
      );
      setAmount("");
      setReason("");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>캐시 지급 / 회수</CardTitle>
      <p className="text-xs text-muted">
        양수: 지급, 음수: 회수 (예: -1000 = 1,000 캐시 회수)
      </p>
      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success">
          ✅ {success}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label="캐시 금액"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="예) 5000 또는 -1000"
        />
        <Input
          label="사유"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예) 베타 테스터 보상"
        />
      </div>
      <Button type="button" onClick={submit} disabled={busy}>
        {busy ? "처리 중..." : "적용"}
      </Button>
    </Card>
  );
}
