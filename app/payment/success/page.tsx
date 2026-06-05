import { Suspense } from "react";
import { PaymentSuccessClient } from "@/components/credits/PaymentSuccessClient";

export const metadata = {
  title: "결제 완료 | 카타임",
};

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Suspense fallback={<div className="text-center text-sm text-muted">결제 정보 확인 중...</div>}>
        <PaymentSuccessClient />
      </Suspense>
    </div>
  );
}
