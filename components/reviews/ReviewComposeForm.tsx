"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatKRW } from "@/lib/utils/format";
import { REVIEW_REWARD } from "@/lib/credits/constants";

type Props = {
  vehicleId: string;
  carSummary: string; // 번호판 없는 차량 요약
  currentPrice: number;
  signalLabel: string;
  onClose: () => void;
};

/** 후기 작성 폼 (차량 선택 이후 공용). 보상 안내를 위쪽에 강조. */
export function ReviewComposeForm({
  vehicleId,
  carSummary,
  currentPrice,
  signalLabel,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, reviewText: text.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "등록에 실패했어요");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-success">
          ✅ 후기가 접수됐어요! 운영자 확인 후 게시판에 공개되며, 그때 보상{" "}
          <b>{REVIEW_REWARD}캐시</b>가 지급돼요. (차량 1대당 1회)
        </div>
        <Button onClick={onClose} fullWidth>
          확인
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 보상 강조 배너 */}
      <div className="rounded-lg bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
        🎁 후기 등록하면 {REVIEW_REWARD}캐시 지급! (승인 후)
      </div>

      {/* 게시판에 공개될 차량 요약 (개인정보 없음) */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm font-semibold text-foreground">{carSummary}</p>
        <p className="text-xs text-muted">
          업자 매입가 {formatKRW(currentPrice)} · {signalLabel}
        </p>
        <p className="mt-1 text-[11px] text-muted">
          위 정보가 후기와 함께 게시판에 공개돼요. 차량번호 등 개인정보는 포함되지
          않아요.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">한줄 후기</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="예: 딜러 견적이랑 비슷하게 나와서 매각 시점 정하는 데 도움됐어요!"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-[11px] text-muted">
          전화번호·차량번호 등 개인정보는 넣지 말아주세요.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        onClick={submit}
        disabled={busy || text.trim().length < 5}
        fullWidth
        size="lg"
      >
        {busy ? "등록 중…" : `후기 등록하고 ${REVIEW_REWARD}캐시 받기`}
      </Button>
    </div>
  );
}
