"use client";

import { useEffect } from "react";

/**
 * 일반 페이지 렌더링 중 예외가 나면 표시되는 화면.
 * 영어 스택트레이스 대신 한국어 안내 + 다시시도/홈 버튼.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에만 기록 (운영자 디버깅용). 사용자에겐 노출 안 함.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="text-xl font-bold text-foreground">
        일시적인 오류가 발생했어요
      </h1>
      <p className="max-w-xs text-sm text-muted">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 help@cartiming.app 으로
        알려주시면 빠르게 도와드릴게요.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
