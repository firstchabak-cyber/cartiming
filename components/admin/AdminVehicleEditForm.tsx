"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminDeleteButton } from "./AdminDeleteButton";

type V = {
  id: string;
  manufacturer: string;
  model: string;
  trim: string | null;
  year: number;
  mileage: number;
  plate_number: string | null;
  color: string | null;
  status: string;
};

export function AdminVehicleEditForm({ vehicle }: { vehicle: V }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [manufacturer, setManufacturer] = useState(vehicle.manufacturer);
  const [model, setModel] = useState(vehicle.model);
  const [trim, setTrim] = useState(vehicle.trim ?? "");
  const [year, setYear] = useState(String(vehicle.year));
  const [mileage, setMileage] = useState(String(vehicle.mileage));
  const [plate, setPlate] = useState(vehicle.plate_number ?? "");
  const [color, setColor] = useState(vehicle.color ?? "");
  const [status, setStatus] = useState(vehicle.status);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          trim: trim.trim() || null,
          year: Number(year),
          mileage: Number(mileage.replace(/[^0-9]/g, "")),
          plate_number: plate.trim() || null,
          color: color.trim() || null,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "수정 실패");
        return;
      }
      setMsg("✅ 수정되었습니다");
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
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          ✏️ 차량 정보 수정
        </Button>
        <AdminDeleteButton
          endpoint={`/api/admin/vehicles/${vehicle.id}`}
          label="차량 삭제"
          confirmWord="삭제"
        />
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-2 border-primary/40">
      <CardTitle className="text-sm">차량 정보 수정 (관리자)</CardTitle>
      <div className="grid grid-cols-2 gap-2">
        <Input label="제조사" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        <Input label="모델" value={model} onChange={(e) => setModel(e.target.value)} />
        <Input label="트림" value={trim} onChange={(e) => setTrim(e.target.value)} />
        <Input label="연식" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        <Input label="주행거리(km)" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        <Input label="번호판" value={plate} onChange={(e) => setPlate(e.target.value)} />
        <Input label="외장색" value={color} onChange={(e) => setColor(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="active">활성</option>
            <option value="sold">매각 완료</option>
            <option value="deleted">삭제</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={busy} fullWidth>
          {busy ? "저장 중..." : "저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy} fullWidth>
          취소
        </Button>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </Card>
  );
}
