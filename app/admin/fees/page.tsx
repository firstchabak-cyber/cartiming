import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/utils/format";
import { FEE_STATUS_LABEL } from "@/lib/sales/fee";
import { FeeStatusButton } from "@/components/admin/FeeStatusButton";

type FeeRow = {
  id: string;
  channel: string;
  sold_price: number;
  sold_at: string;
  fee_amount: number | null;
  fee_status: string | null;
  fee_charged_at: string | null;
  fee_paid_at: string | null;
  fee_note: string | null;
  snapshot_manufacturer: string;
  snapshot_model: string;
  snapshot_year: number;
  source_sale_request_id: string | null;
};

type DealerLite = { dealer_id: string | null; dealer_name: string };

export default async function AdminFeesPage() {
  const admin = createAdminClient();
  const { data: txns } = await admin
    .from("sale_transactions")
    .select(
      "id, channel, sold_price, sold_at, fee_amount, fee_status, fee_charged_at, fee_paid_at, fee_note, snapshot_manufacturer, snapshot_model, snapshot_year, source_sale_request_id",
    )
    .eq("channel", "cartiming")
    .order("sold_at", { ascending: false })
    .limit(200);

  const list = (txns as FeeRow[]) ?? [];

  // 각 거래의 선정 딜러 정보 묶기
  const requestIds = list
    .map((t) => t.source_sale_request_id)
    .filter((id): id is string => !!id);
  const { data: selectedBids } =
    requestIds.length > 0
      ? await admin
          .from("sale_requests")
          .select(
            "id, selected_bid:sale_bids!sale_requests_selected_bid_id_fkey(dealer_id, dealer_name)",
          )
          .in("id", requestIds)
      : { data: null };
  const dealerMap = new Map<string, DealerLite>();
  for (const r of (selectedBids ?? []) as Array<{
    id: string;
    selected_bid: DealerLite | DealerLite[] | null;
  }>) {
    const b = Array.isArray(r.selected_bid) ? r.selected_bid[0] : r.selected_bid;
    if (b) dealerMap.set(r.id, b);
  }

  const uncharged = list.filter((t) => t.fee_status === "uncharged");
  const charged = list.filter((t) => t.fee_status === "charged");
  const paid = list.filter((t) => t.fee_status === "paid");

  const totalDue = [...uncharged, ...charged].reduce(
    (sum, t) => sum + (t.fee_amount ?? 0),
    0,
  );
  const totalCollected = paid.reduce((sum, t) => sum + (t.fee_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">수수료 정산</h1>
        <p className="text-sm text-muted">
          카타이밍 통한 매각 완료 건의 딜러 수수료 추적 (1,000만원 미만 15만원
          / 이상 1.5%)
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">미청구</p>
          <p className="text-xl font-bold text-warning">{uncharged.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">청구 중</p>
          <p className="text-xl font-bold text-primary">{charged.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">입금 완료</p>
          <p className="text-xl font-bold text-success">{paid.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">미수금 합계</p>
          <p className="text-base font-bold text-warning">
            {formatKRW(totalDue)}
          </p>
          <p className="text-[10px] text-muted">
            누적 입금 {formatKRW(totalCollected)}
          </p>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            아직 정산 대상 거래가 없습니다. 카타이밍 매각 완료 시 자동 등록됩니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted">
              <tr>
                <th className="p-2 text-left">매각일</th>
                <th className="p-2 text-left">차종</th>
                <th className="p-2 text-left">딜러</th>
                <th className="p-2 text-right">매각가</th>
                <th className="p-2 text-right">수수료</th>
                <th className="p-2 text-left">상태</th>
                <th className="p-2 text-left">액션</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const dealer = t.source_sale_request_id
                  ? dealerMap.get(t.source_sale_request_id)
                  : null;
                const status = t.fee_status ?? "uncharged";
                const tone =
                  status === "paid"
                    ? "success"
                    : status === "charged"
                      ? "warning"
                      : status === "waived"
                        ? "neutral"
                        : "danger";
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-surface">
                    <td className="p-2 text-xs">{t.sold_at}</td>
                    <td className="p-2">
                      {t.snapshot_manufacturer} {t.snapshot_model} (
                      {t.snapshot_year})
                    </td>
                    <td className="p-2 text-xs">
                      {dealer?.dealer_name ?? "운영자 등록"}
                    </td>
                    <td className="p-2 text-right">
                      {formatKRW(t.sold_price)}
                    </td>
                    <td className="p-2 text-right font-semibold text-warning">
                      {t.fee_amount ? formatKRW(t.fee_amount) : "-"}
                    </td>
                    <td className="p-2">
                      <Badge tone={tone}>
                        {FEE_STATUS_LABEL[status] ?? status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <FeeStatusButton
                        transactionId={t.id}
                        currentStatus={status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
