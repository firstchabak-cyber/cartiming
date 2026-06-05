"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { REFERRAL_REWARD } from "@/lib/credits/constants";

/**
 * 마이페이지의 친구 추천 카드.
 * 내 추천 링크를 복사/공유해 친구를 초대한다.
 */
export function ReferralCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const shareText =
    `🚗 내 차 시세, AI가 분석해주는 카타임\n` +
    `이 링크로 가입하고 무료 시세 분석 받아보세요!\n${link}`;

  const onShare = async () => {
    const canShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (canShare) {
      try {
        await navigator.share({ title: "카타임 초대", text: shareText });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시
    }
  };

  return (
    <Card className="flex flex-col gap-2 bg-primary/5">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <CardTitle className="text-sm">친구 초대하고 캐시 받기</CardTitle>
      </div>
      <p className="text-xs text-muted">
        내 링크로 가입한 친구가 첫 시세 분석을 완료하면{" "}
        <span className="font-semibold text-primary">
          {REFERRAL_REWARD.toLocaleString("ko-KR")} 캐시
        </span>
        를 드려요.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-muted"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={onShare}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          {copied ? "✓ 복사됨" : "공유하기"}
        </button>
      </div>
    </Card>
  );
}
