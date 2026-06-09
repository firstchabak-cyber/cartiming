"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { ReviewComposeForm } from "@/components/reviews/ReviewComposeForm";
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        aria-label="후기 남기기"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        후기 +{REVIEW_REWARD}
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
            <ReviewComposeForm
              vehicleId={vehicleId}
              carSummary={carSummary}
              currentPrice={currentPrice}
              signalLabel={signalLabel}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
