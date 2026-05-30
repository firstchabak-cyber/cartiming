"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type W = {
  id: string;
  manufacturer: string;
  model: string;
  year_min: number | null;
  year_max: number | null;
  max_mileage: number | null;
  max_price: number | null;
  region: string | null;
  memo: string | null;
};

export function WantedEditForm({ wanted }: { wanted: W }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [manufacturer, setManufacturer] = useState(wanted.manufacturer);
  const [model, setModel] = useState(wanted.model);
  const [yearMin, setYearMin] = useState(wanted.year_min?.toString() ?? "");
  const [yearMax, setYearMax] = useState(wanted.year_max?.toString() ?? "");
  const [maxMileage, setMaxMileage] = useState(
    wanted.max_mileage?.toString() ?? "",
  );
  const [maxPrice, setMaxPrice] = useState(wanted.max_price?.toString() ?? "");
  const [region, setRegion] = useState(wanted.region ?? "");
  const [memo, setMemo] = useState(wanted.memo ?? "");

  const num = (s: string) => {
    const n = s.replace(/[^0-9]/g, "");
    return n ? Number(n) : null;
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/wanted/${wanted.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          year_min: num(yearMin),
          year_max: num(yearMax),
          max_mileage: num(maxMileage),
          max_price: num(maxPrice),
          region: region.trim() || null,
          memo: memo.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "수정 실패");
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-semibold text-primary hover:underline"
      >
        ✏️ 요청 수정
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input label="제조사" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        <Input label="모델" value={model} onChange={(e) => setModel(e.target.value)} />
        <Input label="연식(최소)" inputMode="numeric" value={yearMin} onChange={(e) => setYearMin(e.target.value)} />
        <Input label="연식(최대)" inputMode="numeric" value={yearMax} onChange={(e) => setYearMax(e.target.value)} />
        <Input label="주행상한(km)" inputMode="numeric" value={maxMileage} onChange={(e) => setMaxMileage(e.target.value)} />
        <Input label="희망가상한(원)" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <Input label="지역" value={region} onChange={(e) => setRegion(e.target.value)} />
        <Input label="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={busy} fullWidth>
          {busy ? "저장 중..." : "저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy} fullWidth>
          취소
        </Button>
      </div>
      {msg && <p className="text-xs text-danger">{msg}</p>}
    </div>
  );
}
