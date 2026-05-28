import { ChargeClient } from "@/components/credits/ChargeClient";
import { CHARGE_PACKAGES } from "@/lib/payments/packages";

export const metadata = {
  title: "캐시 충전 | 카타이밍",
};

export default function ChargePage() {
  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ??
    "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">캐시 충전</h1>
      <p className="text-xs text-muted">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.{" "}
        <span className="text-warning">
          (현재 테스트 키 사용 중 — 실제 결제 X)
        </span>
      </p>
      <ChargeClient packages={CHARGE_PACKAGES} tossClientKey={clientKey} />
    </div>
  );
}
