// 입금 신청 상태를 고객 화면에서 일관되게 표시하기 위한 매핑.

export type DepositStatus = "pending" | "confirmed" | "rejected";

export type DepositRequest = {
  id: string;
  package_id: string;
  amount_krw: number;
  credits: number;
  depositor_name: string;
  status: DepositStatus;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

export const DEPOSIT_STATUS: Record<
  DepositStatus,
  { label: string; tone: "warning" | "success" | "danger"; desc: string }
> = {
  pending: {
    label: "입금 확인 중",
    tone: "warning",
    desc: "입금이 확인되면 캐시를 지급해드려요. 보통 영업시간 내 처리됩니다.",
  },
  confirmed: {
    label: "캐시 지급 완료",
    tone: "success",
    desc: "입금이 확인되어 캐시가 지급되었어요.",
  },
  rejected: {
    label: "반려됨",
    tone: "danger",
    desc: "입금이 확인되지 않았어요.",
  },
};
