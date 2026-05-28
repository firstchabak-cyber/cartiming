import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW, formatDate } from "@/lib/utils/format";
import { FEE_STATUS_LABEL } from "@/lib/sales/fee";
import { BUSINESS_INFO } from "@/lib/constants/business";
import { ReportPaymentButton } from "@/components/dealer/ReportPaymentButton";

export const dynamic = "force-dynamic";

type Bid = { dealer_id: string };
type SaleReqRow = {
  id: string;
  selected_bid: Bid | Bid[] | null;
};
type FeeRow = {
  id: string;
  sold_price: number;
  sold_at: string;
  fee_amount: number | null;
  fee_status: string | null;
  fee_charged_at: string | null;
  fee_paid_at: string | null;
  fee_payment_reported_at: string | null;
  snapshot_manufacturer: string;
  snapshot_model: string;
  snapshot_year: number;
  source_sale_request_id: string | null;
};

export default async function DealerFeesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // 내가 선정된 매각 요청 ID 목록
  const { data: myBidRequests } = await admin
    .from("sale_requests")
    .select(
      "id, selected_bid:sale_bids!sale_requests_selected_bid_id_fkey(dealer_id)",
    )
    .not("selected_bid_id", "is", null);

  const myRequestIds = ((myBidRequests ?? []) as SaleReqRow[])
    .filter((r) => {
      const b = Array.isArray(r.selected_bid)
        ? r.selected_bid[0]
        : r.selected_bid;
      return b?.dealer_id === user.id;
    })
    .map((r) => r.id);

  if (myRequestIds.length === 0) {
    return (
      <EmptyState />
    );
  }

  const { data: txns } = await admin
    .from("sale_transactions")
    .select(
      "id, sold_price, sold_at, fee_amount, fee_status, fee_charged_at, fee_paid_at, fee_payment_reported_at, snapshot_manufacturer, snapshot_model, snapshot_year, source_sale_request_id",
    )
    .in("source_sale_request_id", myRequestIds)
    .eq("channel", "cartiming")
    .order("sold_at", { ascending: false });

  const list = (txns as FeeRow[]) ?? [];

  if (list.length === 0) {
    return <EmptyState />;
  }

  const charged = list.filter(
    (t) => t.fee_status === "charged" && !t.fee_payment_reported_at,
  );
  const reported = list.filter(
    (t) => t.fee_status === "charged" && !!t.fee_payment_reported_at,
  );
  const paid = list.filter((t) => t.fee_status === "paid");
  const uncharged = list.filter((t) => t.fee_status === "uncharged");

  const totalDue = [...charged, ...reported].reduce(
    (sum, t) => sum + (t.fee_amount ?? 0),
    0,
  );
  const bank = BUSINESS_INFO.bankAccount;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 수수료</h1>
        <div className="flex gap-3 text-xs">
          <Link href="/dealer/listings" className="text-primary underline">
            매물 리스트
          </Link>
          <Link href="/dealer/bids" className="text-primary underline">
            내 입찰 내역
          </Link>
        </div>
      </header>

      {/* 입금 계좌 안내 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardTitle>입금 계좌</CardTitle>
        <div className="mt-2 flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted">은행</span>{" "}
            <span className="font-semibold">{bank.bankName}</span>
          </p>
          <p>
            <span className="text-muted">계좌번호</span>{" "}
            <span className="font-mono text-base font-bold">
              {bank.accountNumber}
            </span>
          </p>
          <p>
            <span className="text-muted">예금주</span>{" "}
            <span className="font-semibold">{bank.accountHolder}</span>
          </p>
        </div>
        <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          ⚠️ 입금 시 입금자명에 <b>딜러 이름</b> 또는 <b>차량번호</b> 표기 부탁드립니다.
          입금 후 아래 거래에서 <b>입금했어요</b> 버튼을 눌러주세요.
        </p>
      </Card>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="flex flex-col gap-1 p-3">
          <p className="text-[11px] text-muted">청구 중</p>
          <p className="text-lg font-bold text-warning">{charged.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1 p-3">
          <p className="text-[11px] text-muted">입금 확인 중</p>
          <p className="text-lg font-bold text-primary">{reported.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1 p-3">
          <p className="text-[11px] text-muted">완료</p>
          <p className="text-lg font-bold text-success">{paid.length}건</p>
        </Card>
      </div>

      <Card className="flex items-center justify-between p-3">
        <span className="text-sm text-muted">미입금 합계</span>
        <span className="text-lg font-bold text-warning">
          {formatKRW(totalDue)}
        </span>
      </Card>

      {/* 거래 목록 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">거래 내역</h2>
        {list.map((t) => {
          const status = t.fee_status ?? "uncharged";
          const isReported = !!t.fee_payment_reported_at && status === "charged";
          const tone =
            status === "paid"
              ? "success"
              : isReported
                ? "primary"
                : status === "charged"
                  ? "warning"
                  : status === "waived"
                    ? "neutral"
                    : "danger";
          const label = isReported
            ? "입금 확인 중"
            : (FEE_STATUS_LABEL[status] ?? status);
          return (
            <Card key={t.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold">
                    {t.snapshot_manufacturer} {t.snapshot_model} (
                    {t.snapshot_year})
                  </p>
                  <p className="text-xs text-muted">
                    매각일 {formatDate(t.sold_at)} · 매각가{" "}
                    {formatKRW(t.sold_price)}
                  </p>
                </div>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <span className="text-xs text-muted">수수료</span>
                <span className="text-base font-bold text-warning">
                  {t.fee_amount ? formatKRW(t.fee_amount) : "-"}
                </span>
              </div>
              {t.fee_charged_at && (
                <p className="text-[11px] text-muted">
                  청구 {formatDate(t.fee_charged_at)}
                  {t.fee_payment_reported_at &&
                    ` · 입금 신고 ${formatDate(t.fee_payment_reported_at)}`}
                  {t.fee_paid_at && ` · 입금 확인 ${formatDate(t.fee_paid_at)}`}
                </p>
              )}
              {status === "charged" && !isReported && (
                <ReportPaymentButton transactionId={t.id} />
              )}
              {isReported && (
                <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  운영자가 입금을 확인 중입니다. 영업일 기준 1~2일 안에
                  완료됩니다.
                </p>
              )}
            </Card>
          );
        })}
      </section>

      {uncharged.length > 0 && (
        <p className="text-[11px] text-muted">
          ※ '미청구' 상태는 운영자가 아직 청구하지 않은 거래로, 청구 후 알림이
          발송됩니다.
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 수수료</h1>
        <Link
          href="/dealer/listings"
          className="text-xs text-primary underline"
        >
          매물 리스트
        </Link>
      </header>
      <Card className="py-10 text-center">
        <CardDescription>아직 청구된 수수료가 없습니다.</CardDescription>
      </Card>
    </div>
  );
}
