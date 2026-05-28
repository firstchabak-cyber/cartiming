import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW, formatDate, formatMileage } from "@/lib/utils/format";
import { SelectBidButton } from "@/components/sale/SelectBidButton";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "입찰 진행 중", tone: "warning" },
  bidding: { label: "입찰 진행 중", tone: "warning" },
  matched: { label: "딜러 선택 완료", tone: "success" },
  completed: { label: "매각 완료", tone: "neutral" },
  canceled: { label: "취소됨", tone: "danger" },
};

export default async function SaleStatusPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: sale } = await supabase
    .from("sale_requests")
    .select(
      "id, vehicle_id, status, current_mileage, contact_phone, contact_kakao, sale_timing, sale_reason, additional_notes, bidding_closes_at, matched_at, completed_at, selected_bid_id, created_at",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sale) notFound();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, manufacturer, model, trim, year, mileage, plate_number")
    .eq("id", sale.vehicle_id)
    .maybeSingle();

  const { data: bids } = await supabase
    .from("sale_bids")
    .select(
      "id, dealer_name, dealer_phone, dealer_location, bid_amount, notes, status, created_at",
    )
    .eq("sale_request_id", sale.id)
    .order("bid_amount", { ascending: false });

  const meta = STATUS_META[sale.status] ?? STATUS_META.pending;
  const bidsList = bids ?? [];
  const selectedBid = bidsList.find((b) => b.id === sale.selected_bid_id);
  const otherBids = bidsList.filter((b) => b.id !== sale.selected_bid_id);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">매각 신청</h1>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </header>

      {vehicle && (
        <Card className="flex flex-col gap-1">
          {vehicle.plate_number && (
            <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {vehicle.plate_number}
            </span>
          )}
          <CardTitle>
            {vehicle.manufacturer} {vehicle.model}
            {vehicle.trim ? ` · ${vehicle.trim}` : ""}
          </CardTitle>
          <CardDescription>
            {vehicle.year}년식 · {formatMileage(sale.current_mileage ?? vehicle.mileage)}
          </CardDescription>
        </Card>
      )}

      {sale.status === "matched" && selectedBid && (
        <Card className="flex flex-col gap-2 border-success bg-success/5">
          <p className="text-sm font-semibold text-success">
            ✅ 선택한 딜러 — 연락처
          </p>
          <p className="text-base font-bold text-foreground">
            {selectedBid.dealer_name}
          </p>
          <p className="text-sm text-foreground">
            💰 {formatKRW(selectedBid.bid_amount)}
          </p>
          {selectedBid.dealer_phone && (
            <p className="text-sm">
              📞{" "}
              <a
                href={`tel:${selectedBid.dealer_phone}`}
                className="text-primary underline"
              >
                {selectedBid.dealer_phone}
              </a>
            </p>
          )}
          {selectedBid.dealer_location && (
            <p className="text-sm text-muted">📍 {selectedBid.dealer_location}</p>
          )}
          {selectedBid.notes && (
            <p className="text-xs text-muted">비고: {selectedBid.notes}</p>
          )}
          <p className="mt-2 text-xs text-muted">
            딜러에게도 본인 연락처(휴대폰: {sale.contact_phone}
            {sale.contact_kakao ? `, 카톡: ${sale.contact_kakao}` : ""})
            가 전달되었습니다. 양측이 직접 연락해서 미팅·계약 진행해주세요.
          </p>
          <Link
            href={`/vehicles/${sale.vehicle_id}`}
            className="mt-2 text-xs text-primary underline"
          >
            거래 완료 후 차량 상세에서 "매각 완료 처리" 버튼을 눌러주세요 →
          </Link>
        </Card>
      )}

      {(sale.status === "pending" || sale.status === "bidding") && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">진행 상황</p>
          <p className="text-xs text-muted">
            {bidsList.length === 0
              ? "딜러에게 매물 정보가 전달되었습니다. 보통 1~3일 안에 입찰가가 도착합니다."
              : `현재 ${bidsList.length}건의 입찰이 도착했습니다.`}
          </p>
          {sale.bidding_closes_at && (
            <p className="text-xs text-muted">
              입찰 마감: {formatDate(sale.bidding_closes_at)}
            </p>
          )}
        </Card>
      )}

      {bidsList.length > 0 && sale.status !== "completed" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            입찰 {bidsList.length}건 (높은 가격순)
          </h2>
          {(sale.status === "matched" ? otherBids : bidsList).map((b, i) => (
            <Card key={b.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {sale.status !== "matched" && i === 0 ? "🏆 " : ""}
                    {b.dealer_name}
                  </p>
                  {b.dealer_location && (
                    <p className="text-xs text-muted">📍 {b.dealer_location}</p>
                  )}
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatKRW(b.bid_amount)}
                </p>
              </div>
              {b.notes && <p className="text-xs text-muted">{b.notes}</p>}
              {sale.status === "pending" || sale.status === "bidding" ? (
                <SelectBidButton
                  saleRequestId={sale.id}
                  bidId={b.id}
                  dealerName={b.dealer_name}
                  bidAmount={b.bid_amount}
                />
              ) : null}
            </Card>
          ))}
        </section>
      )}

      <section className="mt-2 flex flex-col gap-2 text-xs text-muted">
        <p>신청일: {formatDate(sale.created_at)}</p>
        {sale.matched_at && <p>딜러 선택일: {formatDate(sale.matched_at)}</p>}
        {sale.completed_at && <p>매각 완료일: {formatDate(sale.completed_at)}</p>}
      </section>
    </div>
  );
}
