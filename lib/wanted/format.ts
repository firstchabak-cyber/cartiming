/**
 * 딜러 구매요청(dealer_wanted) 표시용 헬퍼.
 */

export type WantedRow = {
  id: string;
  dealer_id: string;
  dealer_name: string;
  manufacturer: string;
  model: string;
  year_min: number | null;
  year_max: number | null;
  max_mileage: number | null;
  max_price: bigint | number | null;
  region: string | null;
  memo: string | null;
  expires_at: string | null;
  status: string;
  reject_reason: string | null;
  approved_at: string | null;
  created_at: string;
};

export const WANTED_STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기",
  approved: "공개 중",
  rejected: "반려",
  expired: "기간 만료",
  closed: "마감",
};

/** 연식 조건 문자열: "2018~2021년식" / "2020년식 이상" / "연식 무관" */
export function yearRangeLabel(min: number | null, max: number | null): string {
  if (min && max) return min === max ? `${min}년식` : `${min}~${max}년식`;
  if (min) return `${min}년식 이상`;
  if (max) return `${max}년식 이하`;
  return "연식 무관";
}

/** 한 줄 조건 요약 */
export function conditionSummary(w: WantedRow): string {
  const parts: string[] = [yearRangeLabel(w.year_min, w.year_max)];
  if (w.max_mileage != null)
    parts.push(`${w.max_mileage.toLocaleString("ko-KR")}km 이하`);
  if (w.max_price != null)
    parts.push(`~${Number(w.max_price).toLocaleString("ko-KR")}원`);
  if (w.region) parts.push(`📍 ${w.region}`);
  return parts.join(" · ");
}

/**
 * 구하는 기간 표시. 만료 임박/만료 여부도 함께 반환.
 * tone: 'normal' | 'urgent' | 'expired'
 */
export function deadlineInfo(
  expiresAt: string | null,
  nowMs: number,
): { label: string; tone: "normal" | "urgent" | "expired" } {
  if (!expiresAt) return { label: "상시 모집", tone: "normal" };
  const end = new Date(expiresAt).getTime();
  const diffDays = Math.ceil((end - nowMs) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "기간 만료", tone: "expired" };
  if (diffDays === 0) return { label: "오늘 마감", tone: "urgent" };
  if (diffDays <= 3) return { label: `D-${diffDays}`, tone: "urgent" };
  return { label: `D-${diffDays}`, tone: "normal" };
}
