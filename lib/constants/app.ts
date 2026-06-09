export const APP_NAME = "카타임";
export const APP_TAGLINE = "내 차의 매각 적기를 알려드립니다";
export const APP_DESCRIPTION =
  "AI가 매월 자동으로 분석하는 내 차의 현재·미래 시세와 매각 적기 알림 서비스";

/** 배포 도메인. SEO(robots/sitemap)·공유 메타 등에 사용. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://cartiming.app";

export type SellSignal = "sell_now" | "review" | "hold";

export const SELL_SIGNAL_LABEL: Record<SellSignal, string> = {
  sell_now: "즉시 매각 권장",
  review: "검토 필요",
  hold: "매각 적기",
};

export const SELL_SIGNAL_COLOR: Record<SellSignal, string> = {
  sell_now: "text-danger",
  review: "text-warning",
  hold: "text-success",
};
