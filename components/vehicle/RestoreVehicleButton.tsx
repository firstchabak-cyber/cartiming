"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RestoreVehicleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async () => {
    if (!confirm("이 차량을 다시 활성 상태로 되돌리시겠어요?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `복구 실패 (HTTP ${res.status})`);
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
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={restore}
        disabled={busy}
      >
        <RotateCcw className="h-4 w-4" />
        {busy ? "처리 중..." : "활성으로 복구"}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-danger">⚠️ {error}</p>
      )}
    </>
  );
}
