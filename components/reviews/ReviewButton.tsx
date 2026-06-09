"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatKRW } from "@/lib/utils/format";
import { REVIEW_REWARD } from "@/lib/credits/constants";

type Props = {
  vehicleId: string;
  carSummary: string; // 예: "현대 그랜저 · 2021년식 · 35,000km" (번호판 없음)
  currentPrice: number;
  signalLabel: string;
};

export function ReviewButton({
  vehicleId,
  carSummary,
  currentPrice,
  signalLabel,
}: Props) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError(null);
        }}
        className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface"
        aria-label="후기 남기기"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        후기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">
                시세 후기 남기기
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 text-lg text-muted hover:text-foreground"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            {done ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-success">
                  ✅ 후기가 접수됐어요! 운영자 확인 후 게시판에 공개되며, 그때
                  보상 {REVIEW_REWARD} 캐시가 지급돼요. (차량 1대당 1회)
                </div>
                <Button onClick={() => setOpen(false)} fullWidth>
                  확인
                </Button>
              </div>
            ) : (
              <>
                {/* 게시판에 공개될 차량 요약 (번호판 등 개인정보 없음) */}
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {carSummary}
                  </p>
                  <p className="text-xs text-muted">
                    업자 매입가 {formatKRW(currentPrice)} · {signalLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    위 정보가 후기와 함께 게시판에 공개돼요. 차량번호 등
                    개인정보는 포함되지 않아요.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    한줄 후기
                  </label>
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

                {error && (
                  <p className="text-sm text-danger">{error}</p>
                )}

                <Button
                  onClick={submit}
                  disabled={busy || text.trim().length < 5}
                  fullWidth
                  size="lg"
                >
                  {busy ? "등록 중…" : "후기 등록하기"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
