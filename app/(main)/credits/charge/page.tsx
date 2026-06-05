import { ChargeClient } from "@/components/credits/ChargeClient";
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
  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ??
    "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
  const isTestKey = clientKey.startsWith("test_");

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

      <p className="text-xs text-muted">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.{" "}
        {isTestKey && (
          <span className="text-warning">
            (현재 테스트 키 사용 중 — 실제 결제 X)
          </span>
        )}
      </p>
      <ChargeClient packages={CHARGE_PACKAGES} tossClientKey={clientKey} />
    </div>
  );
}
