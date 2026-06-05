import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "결제 실패 | 카타임",
};

export default function PaymentFailPage({
  searchParams,
}: {
  searchParams: { code?: string; message?: string; orderId?: string };
}) {
  const message = searchParams.message ?? "결제가 취소되었거나 실패했습니다";
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-3xl">❌</p>
        <CardTitle>결제 실패</CardTitle>
        <CardDescription className="text-danger">{message}</CardDescription>
        {searchParams.orderId && (
          <p className="text-[11px] text-muted">
            주문번호: {searchParams.orderId}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Link href="/credits">
            <Button variant="outline">캐시 페이지로</Button>
          </Link>
          <Link href="/credits/charge">
            <Button>다시 시도</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
