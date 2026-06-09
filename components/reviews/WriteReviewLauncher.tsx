"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReviewComposeForm } from "@/components/reviews/ReviewComposeForm";
import { REVIEW_REWARD } from "@/lib/credits/constants";

type Car = {
  id: string;
  summary: string;
  hasAnalysis: boolean;
  currentPrice: number | null;
  signal: "sell_now" | "review" | "hold" | null;
  alreadyReviewed: boolean;
};

const SIGNAL_LABEL: Record<string, string> = {
  sell_now: "매각 적기",
  review: "관망",
  hold: "보유 유지",
};

export function WriteReviewLauncher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[] | null>(null);
  const [picked, setPicked] = useState<Car | null>(null);

  const openModal = async () => {
    setOpen(true);
    setPicked(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/eligible");
      const data = await res.json().catch(() => null);
      setCars(res.ok ? data.cars ?? [] : []);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  const eligible = (cars ?? []).filter((c) => c.hasAnalysis && !c.alreadyReviewed);

  return (
    <>
      {/* 보상 강조 + 시작 버튼 */}
      <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">
          ✍️ 내 차 후기 쓰고 <span className="text-primary">{REVIEW_REWARD}캐시</span>{" "}
          받기
        </p>
        <p className="text-xs text-muted">
          이미 분석한 차량이면 다시 분석할 필요 없이 바로 쓸 수 있어요. 차량 1대당
          1번, 승인되면 {REVIEW_REWARD}캐시가 지급돼요.
        </p>
        <Button onClick={openModal} fullWidth size="lg">
          <PenLine className="h-4 w-4" />
          후기 쓰고 {REVIEW_REWARD}캐시 받기
        </Button>
      </div>

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
                {picked ? "시세 후기 남기기" : "후기 쓸 차량 선택"}
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

            {picked ? (
              <ReviewComposeForm
                vehicleId={picked.id}
                carSummary={picked.summary}
                currentPrice={picked.currentPrice ?? 0}
                signalLabel={
                  picked.signal ? SIGNAL_LABEL[picked.signal] ?? "" : ""
                }
                onClose={() => setOpen(false)}
              />
            ) : loading ? (
              <p className="py-6 text-center text-sm text-muted">불러오는 중…</p>
            ) : (cars?.length ?? 0) === 0 ? (
              <div className="flex flex-col gap-3 py-4 text-center">
                <p className="text-sm text-muted">
                  등록된 차량이 없어요. 차를 등록하고 시세 분석을 받으면 후기를 쓸
                  수 있어요.
                </p>
                <Link href="/vehicles/new">
                  <Button fullWidth>차량 등록하러 가기</Button>
                </Link>
              </div>
            ) : eligible.length === 0 ? (
              <div className="flex flex-col gap-2 py-2">
                <p className="text-sm text-muted">
                  바로 후기를 쓸 수 있는 차량이 없어요. 아래를 확인해보세요.
                </p>
                <ul className="flex flex-col gap-2">
                  {(cars ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{c.summary}</span>
                      {c.alreadyReviewed ? (
                        <Badge tone="success">후기 완료</Badge>
                      ) : (
                        <Link
                          href={`/analysis?vehicleId=${c.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          분석하러 가기 →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {(cars ?? []).map((c) => {
                  const canWrite = c.hasAnalysis && !c.alreadyReviewed;
                  return (
                    <li key={c.id}>
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => setPicked(c)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-3 text-left hover:bg-surface"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {c.summary}
                            </p>
                            <p className="text-xs text-muted">
                              {c.signal ? SIGNAL_LABEL[c.signal] : ""} · 후기 쓰면 +
                              {REVIEW_REWARD}캐시
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted" />
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                          <span className="text-sm text-muted">{c.summary}</span>
                          {c.alreadyReviewed ? (
                            <Badge tone="success">후기 완료</Badge>
                          ) : (
                            <Link
                              href={`/analysis?vehicleId=${c.id}`}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              분석 필요 →
                            </Link>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
