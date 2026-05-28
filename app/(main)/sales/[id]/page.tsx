import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW, formatDate, formatMileage } from "@/lib/utils/format";
import { SelectBidButton } from "@/components/sale/SelectBidButton";
import { SalePhotoUploader } from "@/components/sale/SalePhotoUploader";
import { BiddingCountdown } from "@/components/sale/BiddingCountdown";
import { ReviewForm } from "@/components/sale/ReviewForm";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "관리자 검토 중", tone: "warning" },
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
      "id, vehicle_id, status, current_mileage, contact_phone, contact_kakao, sale_location, sale_timing, sale_reason, additional_notes, bidding_closes_at, approved_at, matched_at, completed_at, selected_bid_id, final_price, adjustment_reason, adjusted_at, created_at",
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
      "id, dealer_id, dealer_name, dealer_phone, dealer_location, bid_amount, notes, status, created_at",
    )
    .eq("sale_request_id", sale.id)
    .order("bid_amount", { ascending: false });

  // 딜러 평점 묶기 (dealer_id 있는 입찰만)
  const dealerIds = (bids ?? [])
    .map((b) => b.dealer_id)
    .filter((id): id is string => !!id);
  const { data: dealerRatings } =
    dealerIds.length > 0
      ? await supabase
          .from("dealers")
          .select("user_id, business_name, rating_avg, rating_count")
          .in("user_id", dealerIds)
      : { data: null };
  const ratingMap = new Map<
    string,
    { rating_avg: number | null; rating_count: number; business_name: string }
  >();
  for (const d of (dealerRatings ?? []) as Array<{
    user_id: string;
    business_name: string;
    rating_avg: number | null;
    rating_count: number;
  }>) {
    ratingMap.set(d.user_id, {
      rating_avg: d.rating_avg,
      rating_count: d.rating_count,
      business_name: d.business_name,
    });
  }

  // 이미 후기 있는지
  const { data: existingReview } = await supabase
    .from("dealer_reviews")
    .select("id, rating, comment, anonymous, created_at")
    .eq("sale_request_id", sale.id)
    .maybeSingle();

  // 감가 증빙 사진
  const { data: adjPhotoRows } = await supabase
    .from("sale_adjustment_photos")
    .select("id, storage_path")
    .eq("sale_request_id", sale.id)
    .order("sort_order", { ascending: true });
  const adjustmentPhotos = await Promise.all(
    (adjPhotoRows ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("sale-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { id: p.id, signed_url: signed?.signedUrl ?? "" };
    }),
  );

  // 사진 + 서명된 URL
  const { data: photoRows } = await supabase
    .from("sale_photos")
    .select("id, storage_path, sort_order")
    .eq("sale_request_id", sale.id)
    .order("sort_order", { ascending: true });
  const photos = await Promise.all(
    (photoRows ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("sale-photos")
        .createSignedUrl(p.storage_path, 3600);
      return {
        id: p.id,
        storage_path: p.storage_path,
        sort_order: p.sort_order,
        signed_url: signed?.signedUrl ?? "",
      };
    }),
  );

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

      {sale.status === "matched" && selectedBid && sale.final_price && (
        <Card className="flex flex-col gap-3 border-warning bg-warning/5">
          <p className="text-sm font-semibold text-foreground">
            💼 딜러의 실 매입가 조정 결과
          </p>
          <div className="flex justify-between rounded-lg bg-background p-3 text-sm">
            <span className="text-muted">입찰가</span>
            <span className="font-semibold text-foreground">
              {formatKRW(selectedBid.bid_amount)}
            </span>
          </div>
          <div className="flex justify-between rounded-lg bg-background p-3 text-sm">
            <span className="text-muted">실 매입가</span>
            <span className="font-bold text-foreground">
              {formatKRW(sale.final_price)}
            </span>
          </div>
          {sale.final_price !== selectedBid.bid_amount && (
            <div
              className={`flex justify-between rounded-lg p-3 text-sm font-semibold ${
                sale.final_price < selectedBid.bid_amount
                  ? "bg-danger/10 text-danger"
                  : "bg-success/10 text-success"
              }`}
            >
              <span>차이</span>
              <span>
                {sale.final_price > selectedBid.bid_amount ? "+" : ""}
                {formatKRW(sale.final_price - selectedBid.bid_amount)}
              </span>
            </div>
          )}
          {sale.adjustment_reason && (
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs font-semibold text-foreground">조정 사유</p>
              <p className="mt-1 text-xs text-muted whitespace-pre-line">
                {sale.adjustment_reason}
              </p>
            </div>
          )}
          {adjustmentPhotos.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-foreground">감가 증빙 사진</p>
              <div className="flex flex-wrap gap-2">
                {adjustmentPhotos.map((p) => (
                  <a
                    key={p.id}
                    href={p.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-20 w-20 overflow-hidden rounded-lg border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.signed_url}
                      alt="감가 증빙"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {sale.adjusted_at && (
            <p className="text-[11px] text-muted">
              조정일: {formatDate(sale.adjusted_at)}
            </p>
          )}
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
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">
            차량 사진 ({photos.length})
          </p>
          {photos.length === 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
              ⚠️ 사진이 1장도 없으면 딜러 입찰가가 낮을 수 있습니다.
              외관 4면 · 실내 · 휠 정도는 등록 권장.
            </p>
          )}
          <SalePhotoUploader saleRequestId={sale.id} initialPhotos={photos} />
        </Card>
      )}

      {sale.status === "pending" && (
        <Card className="flex flex-col gap-2 border-warning/30 bg-warning/5">
          <p className="text-sm font-semibold text-warning">
            ⏳ 관리자 검토 중
          </p>
          <p className="text-xs text-muted">
            카타이밍 운영자가 신청 내용을 확인하고 있습니다.
            보통 영업시간 내 1~3시간 안에 승인되며, 승인되면 즉시 48시간 입찰이 시작됩니다.
          </p>
          <p className="text-xs text-muted">
            신청 후 사진을 추가해두시면 승인 후 바로 딜러들이 입찰 진행할 수 있어요.
          </p>
        </Card>
      )}

      {sale.status === "bidding" && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">
            입찰 진행 중 ({bidsList.length}건 도착)
          </p>
          {sale.bidding_closes_at && (
            <BiddingCountdown closesAt={sale.bidding_closes_at} />
          )}
          <p className="text-xs text-muted">
            마음에 드는 입찰이 있으면 마감 전이라도 즉시 선택하실 수 있습니다.
            한 번 선택하면 변경 불가하니 신중하게.
          </p>
        </Card>
      )}

      {bidsList.length > 0 && sale.status !== "completed" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            입찰 {bidsList.length}건 (높은 가격순)
          </h2>
          {(sale.status === "matched" ? otherBids : bidsList).map((b, i) => {
            const dealerInfo = b.dealer_id ? ratingMap.get(b.dealer_id) : null;
            return (
              <Card key={b.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {sale.status !== "matched" && i === 0 ? "🏆 " : ""}
                      {b.dealer_name}
                    </p>
                    {dealerInfo?.rating_avg != null && (
                      <p className="text-xs text-warning">
                        ★ {dealerInfo.rating_avg} ({dealerInfo.rating_count}건)
                      </p>
                    )}
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
            );
          })}
        </section>
      )}

      {sale.status === "completed" && !existingReview && selectedBid?.dealer_phone && (
        <ReviewForm
          saleRequestId={sale.id}
          dealerName={selectedBid?.dealer_name ?? "딜러"}
        />
      )}

      {existingReview && (
        <Card className="flex flex-col gap-2 border-success/30 bg-success/5">
          <p className="text-sm font-semibold text-success">
            ✅ 후기 작성 완료
          </p>
          <p className="text-warning">
            {"★".repeat(existingReview.rating)}
            <span className="text-muted">
              {"★".repeat(5 - existingReview.rating)}
            </span>
            <span className="ml-2 text-foreground">
              {existingReview.rating}점
            </span>
          </p>
          {existingReview.comment && (
            <p className="text-sm text-muted">"{existingReview.comment}"</p>
          )}
          <p className="text-[11px] text-muted">
            {formatDate(existingReview.created_at)}
            {existingReview.anonymous && " · 익명"}
          </p>
        </Card>
      )}

      <section className="mt-2 flex flex-col gap-2 text-xs text-muted">
        <p>신청일: {formatDate(sale.created_at)}</p>
        {sale.matched_at && <p>딜러 선택일: {formatDate(sale.matched_at)}</p>}
        {sale.completed_at && <p>매각 완료일: {formatDate(sale.completed_at)}</p>}
      </section>
    </div>
  );
}
