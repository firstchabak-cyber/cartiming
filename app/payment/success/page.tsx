import { PaymentSuccessClient } from "@/components/credits/PaymentSuccessClient";

export const metadata = {
  title: "결제 완료 | 카타이밍",
};

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <PaymentSuccessClient />
    </div>
  );
}
