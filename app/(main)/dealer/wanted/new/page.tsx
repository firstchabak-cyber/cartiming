"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const DURATIONS = [
  { label: "1주일", days: 7 },
  { label: "2주일", days: 14 },
  { label: "1개월", days: 30 },
  { label: "상시", days: null },
];

export default function NewWantedPage() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [maxMileage, setMaxMileage] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [region, setRegion] = useState("");
  const [memo, setMemo] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!manufacturer.trim() || !model.trim()) {
      setError("제조사와 모델은 필수입니다");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/dealer/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          yearMin: yearMin ? Number(yearMin) : null,
          yearMax: yearMax ? Number(yearMax) : null,
          maxMileage: maxMileage ? Number(maxMileage.replace(/,/g, "")) : null,
          maxPrice: maxPrice ? Number(maxPrice.replace(/,/g, "")) : null,
          region: region.trim() || undefined,
          memo: memo.trim() || undefined,
          durationDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "등록 실패");
        return;
      }
      router.push("/dealer/wanted");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <header>
        <Link href="/dealer/wanted" className="text-xs text-primary hover:underline">
          ← 내 구매요청
        </Link>
        <h1 className="mt-2 text-xl font-bold text-foreground">구매요청 등록</h1>
        <p className="text-xs text-muted">
          구하는 차량을 올리면 운영자 승인 후 조건 맞는 차주에게 알림이 갑니다
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="제조사 *"
              placeholder="예: 현대"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              required
            />
            <Input
              label="모델 *"
              placeholder="예: 그랜저"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="연식 (최소)"
              type="number"
              placeholder="예: 2018"
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
            />
            <Input
              label="연식 (최대)"
              type="number"
              placeholder="예: 2021"
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
            />
          </div>
          <Input
            label="주행거리 상한 (km)"
            inputMode="numeric"
            placeholder="예: 50000 (비우면 제한 없음)"
            value={maxMileage}
            onChange={(e) => setMaxMileage(e.target.value)}
          />
          <Input
            label="매입 희망가 상한 (원)"
            inputMode="numeric"
            placeholder="예: 25000000 (비우면 제한 없음)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <Input
            label="희망 지역"
            placeholder="예: 수도권 (선택)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <Input
            label="메모"
            placeholder="예: 무사고 선호 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Card>

        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">구하는 기간</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => {
              const active = durationDays === d.days;
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  className={
                    active
                      ? "rounded-lg border-2 border-primary bg-primary/5 py-2 text-sm font-semibold text-primary"
                      : "rounded-lg border border-border bg-background py-2 text-sm text-foreground hover:bg-surface"
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">
            기간이 지나면 게시판에서 자동으로 내려갑니다. &apos;상시&apos;는 직접 마감할 때까지 유지됩니다.
          </p>
        </Card>

        {error && <p className="text-sm text-danger">⚠️ {error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={busy}>
          {busy ? "등록 중..." : "구매요청 등록"}
        </Button>
      </form>
    </div>
  );
}
