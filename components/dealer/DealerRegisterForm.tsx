"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Initial = {
  business_name: string;
  business_reg_number: string;
  contact_phone: string;
  location: string | null;
} | null;

export function DealerRegisterForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.business_name ?? "");
  const [reg, setReg] = useState(initial?.business_reg_number ?? "");
  const [phone, setPhone] = useState(initial?.contact_phone ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !reg.trim() || !phone.trim()) {
      setError("상호·사업자번호·연락처는 필수입니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: name.trim(),
          businessRegNumber: reg.trim(),
          contactPhone: phone.trim(),
          location: location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `등록 실패 (HTTP ${res.status})`);
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
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}
      <Card className="flex flex-col gap-3">
        <Input
          label="상호 (사업자명)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="○○ 모터스"
        />
        <Input
          label="사업자등록번호"
          value={reg}
          onChange={(e) => setReg(e.target.value)}
          placeholder="123-45-67890"
        />
        <Input
          label="연락처 (휴대폰)"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
        />
        <Input
          label="위치 (선택)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="서울 강남구"
        />
      </Card>
      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "등록 중..." : initial ? "정보 수정" : "딜러 등록 신청"}
      </Button>
      <p className="text-[11px] text-muted">
        등록 후 운영자가 사업자등록 진위 확인 후 승인합니다 (영업일 1~2일).
        승인 전에는 매물 조회만 가능하며 입찰은 불가합니다.
        매각가의 1.5% 수수료가 발생합니다.
      </p>
    </div>
  );
}
