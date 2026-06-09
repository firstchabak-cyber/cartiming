import { Badge } from "@/components/ui/Badge";
import {
  DEPOSIT_STATUS,
  type DepositRequest,
} from "@/lib/payments/depositStatus";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 고객의 입금 충전 신청 내역 목록 (충전 화면·마이페이지 공용) */
export function DepositRequestItems({
  requests,
}: {
  requests: DepositRequest[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">아직 충전 신청 내역이 없어요.</p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {requests.map((r) => {
        const s = DEPOSIT_STATUS[r.status];
        return (
          <li key={r.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {r.amount_krw.toLocaleString("ko-KR")}원 ·{" "}
                {r.credits.toLocaleString("ko-KR")} 캐시
              </p>
              <Badge tone={s.tone}>{s.label}</Badge>
            </div>
            <p className="text-xs text-muted">
              {formatWhen(r.created_at)} · 입금자 {r.depositor_name}
            </p>
            <p className="text-xs text-muted">
              {r.status === "rejected" && r.admin_note
                ? `사유: ${r.admin_note}`
                : s.desc}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
