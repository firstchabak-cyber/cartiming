"use client";

/**
 * 캐시 잔액이 바뀌었을 때(차감/충전 등) 호출하면,
 * 상단 캐시 뱃지(CreditsBadge)가 즉시 다시 조회한다.
 * 서버 라운드트립 없이 클라이언트 컴포넌트 간 신호 전달용.
 */
export const CREDITS_CHANGED_EVENT = "cartiming:credits-changed";

export function notifyCreditsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
  }
}
