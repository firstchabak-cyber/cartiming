"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ReviewForm({
  saleRequestId,
  dealerName,
}: {
  saleRequestId: string;
  dealerName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating === 0) {
      setError("별점을 선택해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleRequestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          anonymous,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `저장 실패 (HTTP ${res.status})`);
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
    <Card className="flex flex-col gap-3 border-warning/30 bg-warning/5">
      <CardTitle>📝 거래 후기 작성</CardTitle>
      <p className="text-xs text-muted">
        <strong>{dealerName}</strong> 와의 거래 경험을 다른 차주들에게 공유해 주세요.
        평점은 딜러 프로필에 표시되어 다른 차주들이 입찰 선택 시 참고합니다.
      </p>

      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">별점</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n}점`}
              >
                <Star
                  className={`h-7 w-7 ${
                    active ? "fill-warning text-warning" : "text-muted"
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 self-center text-sm text-muted">
              {rating}점
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          한 줄 후기 (선택, 500자)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="예) 시세보다 좋은 가격에 매수해주셨고, 명의이전도 당일 처리해주셔서 만족합니다."
          className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        익명으로 등록 (이름 노출 안 함)
      </label>

      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "저장 중..." : "후기 작성 완료"}
      </Button>

      <p className="text-[11px] text-muted">
        후기는 작성 후 수정·삭제할 수 없습니다. 신중하게 작성해 주세요.
      </p>
    </Card>
  );
}
