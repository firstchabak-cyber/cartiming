import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW, formatDate, formatMileage } from "@/lib/utils/format";
import { AdminBidForm } from "@/components/admin/AdminBidForm";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "신규", tone: "warning" },
  bidding: { label: "입찰 중", tone: "warning" },
  matched: { label: "매칭됨", tone: "success" },
  completed: { label: "완료", tone: "neutral" },
  canceled: { label: "취소", tone: "danger" },
};

export default async function AdminSaleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sale_requests")
    .select(
      "id, vehicle_id, user_id, status, current_mileage, contact_phone, contact_kakao, sale_timing, sale_reason, additional_notes, bidding_closes_at, created_at, matched_at, completed_at, selected_bid_id",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) notFound();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, displacement_cc, options, damage_map, plate_number, color, interior_color, registered_at",
    )
    .eq("id", sale.vehicle_id)
    .maybeSingle();

  const { data: bids } = await admin
    .from("sale_bids")
    .select(
      "id, dealer_name, dealer_phone, dealer_location, bid_amount, notes, status, created_at",
    )
    .eq("sale_request_id", sale.id)
    .order("bid_amount", { ascending: false });

  const { data: userInfo } = await admin
    .from("user_credits")
    .select("user_id")
    .eq("user_id", sale.user_id)
    .maybeSingle();

  const meta = STATUS_META[sale.status] ?? STATUS_META.pending;
  const damageMap =
    vehicle?.damage_map && typeof vehicle.damage_map === "object"
      ? (vehicle.damage_map as Record<string, string>)
      : {};
  const damageEntries = Object.entries(damageMap).filter(
    ([, s]) => s && s !== "없음",
  );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href="/admin/sales" className="text-xs text-primary hover:underline">
          ← 매각 신청 목록
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            매각 신청 #{sale.id.slice(0, 8)}
          </h1>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <CardTitle>차량 정보</CardTitle>
          {vehicle && (
            <>
              {vehicle.plate_number && (
                <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  {vehicle.plate_number}
                </span>
              )}
              <p className="text-sm font-semibold">
                {vehicle.manufacturer} {vehicle.model}
                {vehicle.trim ? ` · ${vehicle.trim}` : ""}
              </p>
              <p className="text-xs text-muted">
                {vehicle.year}년식 ·{" "}
                {formatMileage(sale.current_mileage ?? vehicle.mileage)}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-muted">연료</dt>
                <dd className="text-right">{vehicle.fuel_type ?? "-"}</dd>
                <dt className="text-muted">변속기</dt>
                <dd className="text-right">{vehicle.transmission ?? "-"}</dd>
                <dt className="text-muted">차체</dt>
                <dd className="text-right">{vehicle.body_type ?? "-"}</dd>
                {vehicle.color && (
                  <>
                    <dt className="text-muted">외장</dt>
                    <dd className="text-right">{vehicle.color}</dd>
                  </>
                )}
                {vehicle.registered_at && (
                  <>
                    <dt className="text-muted">최초등록</dt>
                    <dd className="text-right">{vehicle.registered_at}</dd>
                  </>
                )}
              </dl>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <CardTitle>차주 연락처</CardTitle>
          <p className="text-sm">
            📞{" "}
            <a
              href={`tel:${sale.contact_phone}`}
              className="text-primary hover:underline"
            >
              {sale.contact_phone}
            </a>
          </p>
          {sale.contact_kakao && (
            <p className="text-sm">💬 카톡: {sale.contact_kakao}</p>
          )}
          <p className="text-xs text-muted">
            user_id: {sale.user_id}
          </p>
          <Link
            href={`/admin/users/${sale.user_id}`}
            className="mt-1 text-xs text-primary hover:underline"
          >
            → 이 사용자 관리 페이지
          </Link>
        </Card>
      </div>

      <Card className="flex flex-col gap-2">
        <CardTitle>매각 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">희망 시기</dt>
          <dd className="text-right">{sale.sale_timing ?? "-"}</dd>
          <dt className="text-muted">매도 사유</dt>
          <dd className="text-right">{sale.sale_reason ?? "-"}</dd>
          <dt className="text-muted">신청일</dt>
          <dd className="text-right">{formatDate(sale.created_at)}</dd>
          {sale.bidding_closes_at && (
            <>
              <dt className="text-muted">입찰 마감</dt>
              <dd className="text-right">{formatDate(sale.bidding_closes_at)}</dd>
            </>
          )}
          {sale.matched_at && (
            <>
              <dt className="text-muted">매칭일</dt>
              <dd className="text-right">{formatDate(sale.matched_at)}</dd>
            </>
          )}
        </dl>
        {sale.additional_notes && (
          <div className="mt-2 rounded-lg bg-surface p-3 text-xs">
            <p className="font-semibold">차주 메모:</p>
            <p className="mt-1 text-muted">{sale.additional_notes}</p>
          </div>
        )}
      </Card>

      {damageEntries.length > 0 && (
        <Card>
          <CardTitle>외판 상태</CardTitle>
          <ul className="mt-2 flex flex-wrap gap-1">
            {damageEntries.map(([part, s]) => (
              <li
                key={part}
                className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning"
              >
                {part} · {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>입찰 ({bids?.length ?? 0}건)</CardTitle>
        </div>
        {(bids ?? []).length === 0 ? (
          <CardDescription className="mt-2">아직 입찰 없음.</CardDescription>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {(bids as Array<{
              id: string;
              dealer_name: string;
              dealer_phone: string | null;
              dealer_location: string | null;
              bid_amount: number;
              notes: string | null;
              status: string;
              created_at: string;
            }>).map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {b.dealer_name}
                    {b.id === sale.selected_bid_id && " 🏆 선택됨"}
                  </p>
                  {b.dealer_phone && (
                    <p className="text-xs text-muted">📞 {b.dealer_phone}</p>
                  )}
                  {b.notes && <p className="text-xs text-muted">{b.notes}</p>}
                </div>
                <p className="text-lg font-bold">{formatKRW(b.bid_amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {["pending", "bidding"].includes(sale.status) && (
        <AdminBidForm saleRequestId={sale.id} />
      )}
    </div>
  );
}
