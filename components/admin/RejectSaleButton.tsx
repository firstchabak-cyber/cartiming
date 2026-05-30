"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * 관리자 '매각 신청 반려' 버튼.
 * 사유를 입력해 신청을 거절(canceled)한다. 차주에게 알림+이메일 발송.
 */
export function RejectSaleButton({ saleRequestId }: { saleRequestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setMsg("반려 사유를 입력해주세요");
      return;
    }
    if (!confirm("이 매각 신청을 반려하시겠어요? 신청이 종료됩니다.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/sales/${saleRequestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "반려 실패");
        return;
      }
      setMsg("✅ 반려했어요");
      router.refresh();
      setTimeout(() => setOpen(false), 1000);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        ❌ 신청 반려
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-xs font-semibold text-foreground">
        반려 사유를 적어주세요 (차주에게 알림+이메일로 전달돼요)
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="예) 동일 차량으로 이미 진행 중인 신청이 있어요 / 허위 정보로 확인됐어요."
        className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-danger focus:outline-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          onClick={submit}
          disabled={busy}
          fullWidth
        >
          {busy ? "처리 중..." : "반려하기"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={busy}
          fullWidth
        >
          취소
        </Button>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
