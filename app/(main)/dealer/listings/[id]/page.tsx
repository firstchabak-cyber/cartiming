import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate, formatMileage } from "@/lib/utils/format";
import { DealerBidForm } from "@/components/dealer/DealerBidForm";
import { SalePhotoGallery } from "@/components/sale/SalePhotoGallery";
import { createAdminClient } from "@/lib/supabase/server";

export default async function DealerListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dealer } = await supabase
    .from("dealers")
    .select("verified, business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) redirect("/dealer/register");

  const { data: sale } = await supabase
    .from("sale_requests")
    .select(
      "id, status, current_mileage, sale_location, sale_timing, sale_reason, additional_notes, bidding_closes_at, created_at, vehicle_id, vehicle:vehicles(manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, vehicle_class, displacement_cc, options, damage_map, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) notFound();

  const v = sale.vehicle as unknown as {
    manufacturer: string;
    model: string;
    trim: string | null;
    year: number;
    mileage: number;
    fuel_type: string | null;
    transmission: string | null;
    body_type: string | null;
    vehicle_class: string | null;
    displacement_cc: number | null;
    options: string[] | null;
    damage_map: Record<string, string> | null;
    plate_number: string | null;
    color: string | null;
    interior_color: string | null;
    registered_at: string | null;
    vin: string | null;
    engine_code: string | null;
    seating_capacity: number | null;
  } | null;

  // 정비/사고 이력 + 사진 (admin client 로 조회 — 딜러는 다른 사용자 데이터 직접 접근 권한 없음)
  const admin = createAdminClient();
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

  const { data: myBid } = await supabase
    .from("sale_bids")
    .select("id, bid_amount, notes, status, created_at")
    .eq("sale_request_id", params.id)
    .eq("dealer_id", user.id)
    .maybeSingle();

  const damageMap =
    v?.damage_map && typeof v.damage_map === "object" ? v.damage_map : {};
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
        <Link href="/dealer/listings" className="text-xs text-primary underline">
          ← 매물 리스트
        </Link>
        <h1 className="mt-1 text-xl font-bold">매물 상세</h1>
      </header>

      <Card className="flex flex-col gap-2">
        {v?.plate_number && (
          <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
            {v.plate_number}
          </span>
        )}
        <CardTitle>
          {v?.manufacturer} {v?.model}
          {v?.trim ? ` · ${v.trim}` : ""}
        </CardTitle>
        <CardDescription>
          {v?.year}년식 · {formatMileage(sale.current_mileage ?? v?.mileage ?? 0)}
        </CardDescription>
      </Card>

      {photos.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">차량 사진 ({photos.length})</CardTitle>
          <SalePhotoGallery photos={photos} />
        </Card>
      )}

      <Card className="flex flex-col gap-2 border-primary/30 bg-primary/5">
        <CardTitle className="text-sm">📍 매각 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          {sale.sale_location && (
            <>
              <dt className="text-muted">판매 지역</dt>
              <dd className="text-right font-semibold">{sale.sale_location}</dd>
            </>
          )}
          {sale.sale_timing && (
            <>
              <dt className="text-muted">희망 시기</dt>
              <dd className="text-right">{sale.sale_timing}</dd>
            </>
          )}
          {sale.sale_reason && (
            <>
              <dt className="text-muted">매도 사유</dt>
              <dd className="text-right">{sale.sale_reason}</dd>
            </>
          )}
          {sale.bidding_closes_at && (
            <>
              <dt className="text-muted">입찰 마감</dt>
              <dd className="text-right">{formatDate(sale.bidding_closes_at)}</dd>
            </>
          )}
        </dl>
        <p className="text-[11px] text-muted">
          탁송비·교통비를 판매 지역 고려해서 입찰가에 반영해주세요.
        </p>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">차량 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">연료</dt>
          <dd className="text-right">{v?.fuel_type ?? "-"}</dd>
          <dt className="text-muted">변속기</dt>
          <dd className="text-right">{v?.transmission ?? "-"}</dd>
          <dt className="text-muted">배기량</dt>
          <dd className="text-right">{v?.displacement_cc ? `${v.displacement_cc}cc` : "-"}</dd>
          <dt className="text-muted">차종</dt>
          <dd className="text-right">{v?.vehicle_class ?? "-"}</dd>
          <dt className="text-muted">차체</dt>
          <dd className="text-right">{v?.body_type ?? "-"}</dd>
          {v?.seating_capacity != null && (
            <>
              <dt className="text-muted">승차정원</dt>
              <dd className="text-right">{v.seating_capacity}명</dd>
            </>
          )}
          {v?.color && (<><dt className="text-muted">외장색</dt><dd className="text-right">{v.color}</dd></>)}
          {v?.interior_color && (<><dt className="text-muted">내장색</dt><dd className="text-right">{v.interior_color}</dd></>)}
          {v?.registered_at && (<><dt className="text-muted">최초등록</dt><dd className="text-right">{v.registered_at}</dd></>)}
          {v?.engine_code && (<><dt className="text-muted">원동기</dt><dd className="text-right">{v.engine_code}</dd></>)}
          {v?.vin && (<><dt className="text-muted">차대번호</dt><dd className="text-right">{v.vin}</dd></>)}
        </dl>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">
          🛠 외판 상태 ({damageEntries.length === 0 ? "무사고·무판금" : `${damageEntries.length}곳 손상`})
        </CardTitle>
        {countedDamage.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-danger">감가 반영 부위</p>
            <ul className="flex flex-wrap gap-1">
              {countedDamage.map(([part, s]) => (
                <li key={part} className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ignoredDamage.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-muted">감가 미반영 (앞/뒤 범퍼·휠)</p>
            <ul className="flex flex-wrap gap-1">
              {ignoredDamage.map(([part, s]) => (
                <li key={part} className="rounded-full bg-muted/15 px-2 py-0.5 text-xs text-muted">
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {v?.options && v.options.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">옵션</CardTitle>
          <p className="text-xs text-muted">{v.options.join(" · ")}</p>
        </Card>
      )}

      {(maintenance?.length ?? 0) > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">
            🔧 정비/사고 이력 ({maintenance!.length}건)
          </CardTitle>
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
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sale.additional_notes && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">📝 차주 메모</CardTitle>
          <p className="text-xs text-muted">{sale.additional_notes}</p>
        </Card>
      )}

      {myBid && (
        <Card className="border-success/30 bg-success/5">
          <p className="text-sm font-semibold text-success">✅ 입찰 완료</p>
          <p className="mt-1 text-sm">
            {myBid.bid_amount.toLocaleString("ko-KR")}원 ({myBid.status})
          </p>
          <p className="text-xs text-muted">{formatDate(myBid.created_at)}</p>
        </Card>
      )}

      {!myBid && dealer.verified && (
        <DealerBidForm saleRequestId={params.id} />
      )}

      {!dealer.verified && (
        <Card className="border-warning/30 bg-warning/5">
          <CardDescription>
            ⏳ 딜러 인증 후 입찰 가능합니다.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
