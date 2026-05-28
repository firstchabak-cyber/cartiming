"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function CompleteSaleButton({
  saleRequestId,
  hasAdjustment,
}: {
  saleRequestId: string;
  hasAdjustment: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleRequestId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `처리 실패 (HTTP ${res.status})`);
        return;
      }
      // 성공 → 차주에게 알림 자동 발송됨, 페이지 새로고침
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3 border-success/30 bg-success/5">
      <CardTitle>✅ 거래 완료 처리</CardTitle>
      <p className="text-xs text-muted">
        차량 인수·입금·명의이전이 완료되면 이 버튼을 눌러주세요.
        {hasAdjustment
          ? " 조정된 실 매입가로 거래가 기록됩니다."
          : " 입찰가 그대로 거래가 기록됩니다."}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-muted">
        <li>처리 시 카타이밍 시세 DB 에 실거래가 누적</li>
        <li>차주에게 거래 완료 알림 + 후기 작성 요청 발송</li>
        <li>수수료 청구 대상으로 자동 등록 (1,000만원 미만 15만원 / 이상 1.5%)</li>
        <li>차주의 영구 무료 차량 슬롯 +1 적립</li>
      </ul>

      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}

      {!confirming ? (
        <Button
          type="button"
          size="lg"
          fullWidth
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <CheckCircle2 className="h-4 w-4" />
          거래 완료 처리
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-warning bg-warning/10 p-3">
          <p className="text-sm font-semibold text-warning">
            정말 처리하시겠어요?
          </p>
          <p className="text-xs text-muted">
            한 번 처리하면 되돌릴 수 없습니다. 차량 인수와 입금이
            모두 완료되었는지 확인해주세요.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              type="button"
              fullWidth
              onClick={complete}
              disabled={busy}
            >
              {busy ? "처리 중..." : "확정"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
