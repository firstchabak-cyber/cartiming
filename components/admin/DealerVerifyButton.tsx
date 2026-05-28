"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DealerVerifyButton({ dealerId }: { dealerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (!confirm("이 딜러를 승인하시겠어요?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-dealer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "승인 실패");
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
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" onClick={verify} disabled={busy} fullWidth>
        {busy ? "처리 중..." : "승인하기"}
      </Button>
      {error && <p className="text-xs text-danger">⚠️ {error}</p>}
    </div>
  );
}
