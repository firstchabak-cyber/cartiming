"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CarDiagram } from "@/components/vehicle/CarDiagram";
import {
  type DamageMap,
  type DamageState,
  nextDamageState,
  NON_DEPRECIATING_PARTS,
} from "@/lib/constants/damage";

type Props = {
  vehicleId: string;
  initial: DamageMap;
};

export function DamageMapEditor({ vehicleId, initial }: Props) {
  const router = useRouter();
  const [map, setMap] = useState<DamageMap>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const handlePartClick = (part: string) => {
    setMap((prev) => {
      const current = prev[part] ?? "없음";
      const next: DamageState = nextDamageState(current);
      const updated = { ...prev };
      if (next === "없음") {
        delete updated[part];
      } else {
        updated[part] = next;
      }
      return updated;
    });
    setDirty(true);
  };

  const reset = () => {
    setMap({});
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ damage_map: map }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const base = data?.error ?? `저장에 실패했습니다 (HTTP ${res.status})`;
        const detail = data?.detail ? ` — ${data.detail}` : "";
        setError(base + detail);
        return;
      }
      router.push(`/vehicles/${vehicleId}`);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const damagedEntries = Object.entries(map).filter(
    ([, state]) => state !== "없음",
  );
  const counted = damagedEntries.filter(
    ([part]) => !NON_DEPRECIATING_PARTS.has(part),
  );
  const ignored = damagedEntries.filter(([part]) =>
    NON_DEPRECIATING_PARTS.has(part),
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs">
        <p className="font-semibold text-foreground">감가 안내</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
          <li>앞범퍼·뒷범퍼·휠은 판금/교환되어도 시세 감가에 반영되지 않습니다.</li>
          <li>판금보다 교환이 더 큰 감가 요인입니다.</li>
          <li>수리 완료된 상태로 입력하세요. 미수리 상태는 시세분석에서 추가 감가됩니다.</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      <CarDiagram mode="damageMap" damageMap={map} onPartClick={handlePartClick} />

      <div className="rounded-lg border border-border bg-surface p-3 text-sm">
        <p className="mb-2 font-semibold text-foreground">현재 입력된 외판 상태</p>
        {damagedEntries.length === 0 ? (
          <p className="text-xs text-muted">
            모든 부위가 이상 없음 상태입니다. 부위를 클릭해서 판금·교환을 표시하세요.
          </p>
        ) : (
          <>
            {counted.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground">감가 반영 부위</p>
                <ul className="flex flex-wrap gap-1">
                  {counted.map(([part, state]) => (
                    <li
                      key={part}
                      className="rounded-full bg-background px-2 py-0.5 text-xs"
                    >
                      {part} · <span className="font-semibold">{state}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ignored.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-xs font-medium text-muted">
                  감가 미반영 부위 (참고)
                </p>
                <ul className="flex flex-wrap gap-1">
                  {ignored.map(([part, state]) => (
                    <li
                      key={part}
                      className="rounded-full bg-background px-2 py-0.5 text-xs text-muted"
                    >
                      {part} · {state}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          disabled={busy || damagedEntries.length === 0}
        >
          모두 초기화
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          fullWidth
        >
          {busy ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Card>
  );
}
