import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW, formatDate, formatMileage } from "@/lib/utils/format";
import { AdminBidForm } from "@/components/admin/AdminBidForm";
import { SalePhotoGallery } from "@/components/sale/SalePhotoGallery";
import { ApproveSaleButton } from "@/components/admin/ApproveSaleButton";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "승인 대기", tone: "warning" },
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
      "id, vehicle_id, user_id, status, current_mileage, contact_phone, contact_kakao, sale_location, sale_timing, sale_reason, additional_notes, bidding_closes_at, approved_at, created_at, matched_at, completed_at, selected_bid_id",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) notFound();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, vehicle_class, displacement_cc, options, damage_map, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity, loan_principal, loan_started_at, loan_months, loan_apr",
    )
    .eq("id", sale.vehicle_id)
    .maybeSingle();

  // 정비/사고 이력
  const { data: maintenance } = await admin
    .from("vehicle_maintenance")
    .select("category, part, description, performed_at, cost")
    .eq("vehicle_id", sale.vehicle_id)
    .order("performed_at", { ascending: false })
    .limit(30);

  const { data: photoRows } = await admin
    .from("sale_photos")
    .select("id, storage_path")
    .eq("sale_request_id", params.id)
    .order("sort_order", { ascending: true });
  const photos = await Promise.all(
    (photoRows ?? []).map(async (p: { id: string; storage_path: string }) => {
      const { data: signed } = await admin.storage
        .from("sale-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { id: p.id, signed_url: signed?.signedUrl ?? "" };
    }),
  );

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
  const NON_DEPRECIATING = new Set([
    "앞범퍼",
    "뒷범퍼",
    "휠(좌앞)",
    "휠(우앞)",
    "휠(좌뒤)",
    "휠(우뒤)",
  ]);
  const countedDamage = damageEntries.filter(([p]) => !NON_DEPRECIATING.has(p));
  const ignoredDamage = damageEntries.filter(([p]) => NON_DEPRECIATING.has(p));

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
                <dt className="text-muted">배기량</dt>
                <dd className="text-right">
                  {vehicle.displacement_cc ? `${vehicle.displacement_cc}cc` : "-"}
                </dd>
                <dt className="text-muted">차종</dt>
                <dd className="text-right">{vehicle.vehicle_class ?? "-"}</dd>
                <dt className="text-muted">차체</dt>
                <dd className="text-right">{vehicle.body_type ?? "-"}</dd>
                {vehicle.seating_capacity != null && (
                  <>
                    <dt className="text-muted">승차정원</dt>
                    <dd className="text-right">{vehicle.seating_capacity}명</dd>
                  </>
                )}
                {vehicle.color && (
                  <>
                    <dt className="text-muted">외장색</dt>
                    <dd className="text-right">{vehicle.color}</dd>
                  </>
                )}
                {vehicle.interior_color && (
                  <>
                    <dt className="text-muted">내장색</dt>
                    <dd className="text-right">{vehicle.interior_color}</dd>
                  </>
                )}
                {vehicle.registered_at && (
                  <>
                    <dt className="text-muted">최초등록</dt>
                    <dd className="text-right">{vehicle.registered_at}</dd>
                  </>
                )}
                {vehicle.engine_code && (
                  <>
                    <dt className="text-muted">원동기</dt>
                    <dd className="text-right">{vehicle.engine_code}</dd>
                  </>
                )}
                {vehicle.vin && (
                  <>
                    <dt className="text-muted">차대번호</dt>
                    <dd className="text-right break-all">{vehicle.vin}</dd>
                  </>
                )}
              </dl>
              {vehicle.options && vehicle.options.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted">옵션</p>
                  <p className="text-xs text-foreground">
                    {(vehicle.options as string[]).join(" · ")}
                  </p>
                </div>
              )}
              {vehicle.loan_principal != null && (
                <div className="mt-2 rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs">
                  <p className="font-semibold text-warning">⚠️ 대출 차량</p>
                  <p className="text-muted">
                    원금 {vehicle.loan_principal.toLocaleString("ko-KR")}원 ·{" "}
                    {vehicle.loan_months}개월 · 연 {vehicle.loan_apr}%
                  </p>
                  {vehicle.loan_started_at && (
                    <p className="text-muted">
                      실행일 {vehicle.loan_started_at}
                    </p>
                  )}
                </div>
              )}
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
          <dt className="text-muted">판매 지역</dt>
          <dd className="text-right font-semibold">{sale.sale_location ?? "-"}</dd>
          <dt className="text-muted">희망 시기</dt>
          <dd className="text-right">{sale.sale_timing ?? "-"}</dd>
          <dt className="text-muted">매도 사유</dt>
          <dd className="text-right">{sale.sale_reason ?? "-"}</dd>
          <dt className="text-muted">신청일</dt>
          <dd className="text-right">{formatDate(sale.created_at)}</dd>
          {sale.approved_at && (
            <>
              <dt className="text-muted">승인일</dt>
              <dd className="text-right">{formatDate(sale.approved_at)}</dd>
            </>
          )}
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

      {photos.length > 0 && (
        <Card>
          <CardTitle>차량 사진 ({photos.length})</CardTitle>
          <div className="mt-2">
            <SalePhotoGallery photos={photos} />
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <CardTitle>
          🛠 외판 상태 (
          {damageEntries.length === 0 ? "무사고·무판금" : `${damageEntries.length}곳 손상`}
          )
        </CardTitle>
        {countedDamage.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-danger">감가 반영 부위</p>
            <ul className="flex flex-wrap gap-1">
              {countedDamage.map(([part, s]) => (
                <li
                  key={part}
                  className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger"
                >
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ignoredDamage.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-muted">
              감가 미반영 (앞/뒤 범퍼·휠)
            </p>
            <ul className="flex flex-wrap gap-1">
              {ignoredDamage.map(([part, s]) => (
                <li
                  key={part}
                  className="rounded-full bg-muted/15 px-2 py-0.5 text-xs text-muted"
                >
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {(maintenance?.length ?? 0) > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle>🔧 정비/사고 이력 ({maintenance!.length}건)</CardTitle>
          <ul className="flex flex-col divide-y divide-border text-xs">
            {(maintenance as Array<{
              category: string;
              part: string;
              description: string | null;
              performed_at: string;
              cost: number | null;
            }>).map((m, i) => (
              <li key={i} className="py-1.5">
                <span className="text-muted">{m.performed_at}</span>
                <span className="ml-2 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                  {m.category}
                </span>
                <span className="ml-2">{m.part}</span>
                {m.description && (
                  <span className="ml-1 text-muted">({m.description})</span>
                )}
                {m.cost != null && (
                  <span className="ml-1 text-muted">
                    · {m.cost.toLocaleString("ko-KR")}원
                  </span>
                )}
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

      {sale.status === "pending" && (
        <ApproveSaleButton saleRequestId={sale.id} />
      )}

      {sale.status === "bidding" && (
        <AdminBidForm saleRequestId={sale.id} />
      )}
    </div>
  );
}
