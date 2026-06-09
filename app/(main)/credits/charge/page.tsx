import { BankTransferCharge } from "@/components/credits/BankTransferCharge";
import { CHARGE_PACKAGES } from "@/lib/payments/packages";
import { Card } from "@/components/ui/Card";
import {
  CREDIT_COSTS,
  FREE_ANALYSIS_PER_MONTH,
  SIGNUP_BONUS,
} from "@/lib/credits/constants";

export const metadata = {
  title: "캐시 충전 | 카타임",
};

export default function ChargePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">캐시 충전</h1>

      {/* 캐시 사용처 안내 — 결제 가치를 체감시켜 전환율 ↑ */}
      <Card className="flex flex-col gap-2 bg-primary/5">
        <p className="text-sm font-semibold text-foreground">
          💡 캐시로 무엇을 할 수 있나요?
        </p>
        <ul className="flex flex-col gap-1 text-xs text-muted">
          <li>
            · AI 시세 분석{" "}
            <span className="font-semibold text-foreground">
              {CREDIT_COSTS.analysisOverage} 캐시/회
            </span>
          </li>
          <li>
            · 차량 추가 등록{" "}
            <span className="font-semibold text-foreground">
              {CREDIT_COSTS.addVehicle} 캐시/대
            </span>
          </li>
        </ul>
        <p className="text-[11px] text-success">
          가입 시 무료 분석 {FREE_ANALYSIS_PER_MONTH}회 · 차량 1대 무료 등록 ·
          신규 가입 보너스 {SIGNUP_BONUS.toLocaleString("ko-KR")} 캐시
        </p>
      </Card>

      {/* 카드 결제 — 준비 중 (토스 심사 완료 전까지) */}
      <Card className="flex items-center justify-between gap-3 opacity-80">
        <div>
          <p className="text-sm font-semibold text-foreground">
            💳 카드 결제
          </p>
          <p className="text-xs text-muted">
            지금은 준비 중이에요. 아래 계좌입금으로 충전해주세요.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          준비중
        </span>
      </Card>

      {/* 계좌입금 충전 */}
      <BankTransferCharge packages={CHARGE_PACKAGES} />

      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted">
        <p className="font-semibold text-foreground">충전 전 안내</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            캐시는 카타임 서비스 내 이용권으로,{" "}
            <span className="font-medium text-foreground">
              현금 인출·이체·환불·타인 양도가 불가
            </span>
            합니다.
          </li>
          <li>
            단, 충전 후 <span className="font-medium text-foreground">미사용 캐시</span>는
            7일 이내 요청 시 관련 법령에 따라 환불됩니다. (사용분·보너스 제외)
          </li>
          <li>
            충전 신청 시 카타임의{" "}
            <a href="/terms" className="text-primary underline" target="_blank">
              이용약관
            </a>{" "}
            및{" "}
            <a href="/privacy" className="text-primary underline" target="_blank">
              개인정보처리방침
            </a>{" "}
            에 동의한 것으로 간주됩니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
