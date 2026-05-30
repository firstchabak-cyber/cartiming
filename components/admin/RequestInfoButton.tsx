"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * 관리자 '추가 입력 요청' 버튼.
 * 코멘트를 입력해 고객/딜러에게 보완을 요청한다 (반려와 달리 상태 유지).
 * endpoint 예: /api/admin/sales/<id>/request-info
 */
export function RequestInfoButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!note.trim()) {
      setMsg("요청 내용을 입력해주세요");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "요청 실패");
        return;
      }
      setMsg("✅ 보완 요청을 보냈어요");
      setNote("");
      router.refresh();
      setTimeout(() => setOpen(false), 1200);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        📝 추가 입력 요청
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
      <p className="text-xs font-semibold text-foreground">
        보완할 내용을 적어주세요 (고객/딜러에게 알림+이메일로 전달돼요)
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="예) 차량 사진이 흐릿해요. 외관 4면 사진을 다시 올려주세요."
        className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy} fullWidth>
          {busy ? "전송 중..." : "보완 요청 보내기"}
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
