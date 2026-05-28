"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AdminBidForm({ saleRequestId }: { saleRequestId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const numAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!name.trim() || !numAmount) {
      setError("딜러명과 입찰가는 필수입니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/${saleRequestId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerName: name.trim(),
          dealerPhone: phone.trim() || undefined,
          dealerLocation: location.trim() || undefined,
          bidAmount: numAmount,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `등록 실패 (HTTP ${res.status})`);
        return;
      }
      setName("");
      setPhone("");
      setLocation("");
      setAmount("");
      setNotes("");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>운영자 — 입찰 수동 등록</CardTitle>
      <p className="text-xs text-muted">
        가입 안 된 딜러로부터 카톡·전화로 받은 입찰을 여기서 대신 등록
      </p>
      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label="딜러명 (필수)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="○○ 모터스"
        />
        <Input
          label="딜러 연락처"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
        />
        <Input
          label="위치"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="서울 강남"
        />
        <Input
          label="입찰가 (필수)"
          inputMode="numeric"
          value={
            amount.replace(/[^0-9]/g, "")
              ? new Intl.NumberFormat("ko-KR").format(
                  Number(amount.replace(/[^0-9]/g, "")),
                )
              : ""
          }
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="29,820,000"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">비고</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="예) 명의이전 즉시 가능"
          className="w-full rounded-xl border border-border bg-background p-3 text-sm"
        />
      </div>
      <Button type="button" onClick={submit} disabled={busy}>
        {busy ? "등록 중..." : "입찰 등록"}
      </Button>
    </Card>
  );
}
