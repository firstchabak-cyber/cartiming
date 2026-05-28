import { Check } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

type Step = {
  label: string;
  state: "done" | "current" | "pending";
  date?: string | null;
  hint?: string;
};

type SaleInput = {
  status: string;
  created_at: string;
  approved_at?: string | null;
  bidding_closes_at?: string | null;
  matched_at?: string | null;
  adjusted_at?: string | null;
  completed_at?: string | null;
  canceled?: boolean;
};

function buildSteps(sale: SaleInput, bidCount: number): Step[] {
  const status = sale.status;

  // 신청 완료 (항상 done)
  const step1: Step = {
    label: "신청 완료",
    state: "done",
    date: sale.created_at,
  };

  // 관리자 승인
  const step2: Step =
    status === "pending"
      ? {
          label: "관리자 승인 대기",
          state: "current",
          hint: "보통 영업시간 내 1~3시간 안에 승인됩니다",
        }
      : {
          label: "관리자 승인",
          state: "done",
          date: sale.approved_at,
        };

  // 입찰 진행
  const step3: Step =
    status === "pending"
      ? { label: "입찰 진행 (48시간)", state: "pending" }
      : status === "bidding"
        ? {
            label: `입찰 진행 중 (${bidCount}건 도착)`,
            state: "current",
            hint: sale.bidding_closes_at
              ? `마감 ${formatDate(sale.bidding_closes_at)}`
              : undefined,
          }
        : { label: "입찰 종료", state: "done", date: sale.bidding_closes_at };

  // 딜러 선정
  const step4: Step =
    status === "pending" || status === "bidding"
      ? { label: "딜러 선정", state: "pending" }
      : status === "matched"
        ? {
            label: "딜러 선정 완료",
            state: sale.adjusted_at ? "done" : "current",
            date: sale.matched_at,
            hint: sale.adjusted_at
              ? undefined
              : "딜러가 차량 실사 후 실 매입가 조정 가능",
          }
        : { label: "딜러 선정 완료", state: "done", date: sale.matched_at };

  // (조건부) 실사 + 매입가 조정
  const showAdjustStep = !!sale.adjusted_at || status === "matched";
  const step5: Step | null = showAdjustStep
    ? sale.adjusted_at
      ? {
          label: "실사 / 매입가 확정",
          state: status === "completed" ? "done" : "current",
          date: sale.adjusted_at,
        }
      : { label: "실사 / 매입가 확정", state: "pending" }
    : null;

  // 매각 완료
  const step6: Step =
    status === "completed"
      ? {
          label: "매각 완료",
          state: "done",
          date: sale.completed_at,
        }
      : {
          label: "매각 완료",
          state: "pending",
          hint:
            status === "matched"
              ? "거래 후 차량 상세에서 '매각 완료 처리' 클릭"
              : undefined,
        };

  return step5 ? [step1, step2, step3, step4, step5, step6] : [step1, step2, step3, step4, step6];
}

export function SaleProgressTimeline({
  sale,
  bidCount,
}: {
  sale: SaleInput;
  bidCount: number;
}) {
  if (sale.canceled || sale.status === "canceled") {
    return (
      <div className="rounded-xl border border-danger bg-danger/10 p-3 text-sm text-danger">
        ❌ 매각 신청이 취소되었습니다.
      </div>
    );
  }

  const steps = buildSteps(sale, bidCount);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">진행 상황</p>
      <ol className="flex flex-col gap-0">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const circleClass =
            s.state === "done"
              ? "bg-success text-white"
              : s.state === "current"
                ? "bg-primary text-white ring-4 ring-primary/20"
                : "bg-surface text-muted";
          const lineClass =
            s.state === "done" ? "bg-success" : "bg-border";
          const labelClass =
            s.state === "done"
              ? "text-foreground"
              : s.state === "current"
                ? "font-semibold text-primary"
                : "text-muted";

          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${circleClass}`}
                >
                  {s.state === "done" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {!isLast && <div className={`my-0.5 h-8 w-0.5 ${lineClass}`} />}
              </div>
              <div className={`flex flex-col gap-0.5 pb-3 ${isLast ? "" : ""}`}>
                <p className={`text-sm ${labelClass}`}>{s.label}</p>
                {s.date && (
                  <p className="text-[11px] text-muted">{formatDate(s.date)}</p>
                )}
                {s.hint && (
                  <p className="text-[11px] text-muted">{s.hint}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
