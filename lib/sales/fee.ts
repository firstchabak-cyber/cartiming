/**
 * 카타임 딜러 매각 수수료 계산.
 *
 * 정책:
 * - 매각가 1,000만원 미만: 15만원 고정
 * - 매각가 1,000만원 이상: 매각가의 1.5%
 *
 * 헤이딜러 (약 3%) 대비 절반 수준으로 책정.
 */

export const FEE_MIN_AMOUNT = 150_000; // 15만원
export const FEE_THRESHOLD = 10_000_000; // 1,000만원
export const FEE_RATE = 0.015; // 1.5%

export function calculateDealerFee(salePrice: number): number {
  if (salePrice < FEE_THRESHOLD) return FEE_MIN_AMOUNT;
  return Math.round(salePrice * FEE_RATE);
}

export const FEE_STATUS_LABEL: Record<string, string> = {
  uncharged: "미청구",
  charged: "청구 중",
  paid: "입금 완료",
  waived: "면제",
};
