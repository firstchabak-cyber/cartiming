"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function MarkAsSoldButton({
  vehicleId,
  carLabel,
}: {
  vehicleId: string;
  carLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `매각 처리 실패 (HTTP ${res.status})`);
        return;
      }
      setOpen(false);
      router.push("/garage");
      router.refresh();
    } catch {
      setError("네트워크 오류로 매각 처리에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        fullWidth
      >
        <CircleDollarSign className="h-4 w-4" />
        매각 완료 처리
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-foreground">
              매각 완료 처리하시겠어요?
            </p>
            <p className="text-sm text-muted">
              <span className="font-medium text-foreground">{carLabel}</span> 차량을
              매각 완료 상태로 변경합니다.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>지난 차량 목록으로 이동됩니다 (정보는 보존됨).</li>
              <li>
                매각 처리 후 <strong>3개월 이내</strong> 에 새 차량 등록 시
                무료 슬롯이 회복됩니다.
              </li>
              <li>시세 분석·알림 대상에서 제외됩니다.</li>
              <li>실수로 처리했으면 지난 차량 목록에서 다시 활성으로 변경 가능.</li>
            </ul>

            {error && (
              <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                ⚠️ {error}
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                취소
              </Button>
              <Button
                type="button"
                fullWidth
                onClick={confirm}
                disabled={busy}
              >
                {busy ? "처리 중..." : "매각 처리"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
