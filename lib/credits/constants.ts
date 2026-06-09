export const CREDIT_COSTS = {
  analysisOverage: 500,
  addVehicle: 1000,
} as const;

/** 가입 후 평생 제공되는 무료 시세분석 횟수 (이후 1회당 analysisOverage 캐시 차감) */
export const FREE_ANALYSIS_PER_MONTH = 1;
export const SIGNUP_BONUS = 2000;
/** 친구가 추천 링크로 가입 후 첫 분석을 하면 추천인에게 지급되는 캐시 */
export const REFERRAL_REWARD = 1000;
/** 시세분석 후기가 승인되면 지급되는 캐시 (차량 1대당 1회) */
export const REVIEW_REWARD = 200;
/** 휴대폰 푸시 알림을 처음 켤 때 1회 차감되는 캐시 */
export const NOTIFICATION_ENABLE_COST = 500;

// 매각 후 슬롯 회복 유효 기간 (개월)
export const SOLD_SLOT_RECOVERY_MONTHS = 3;
