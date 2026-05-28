import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate, formatMileage } from "@/lib/utils/format";
import { DealerBidForm } from "@/components/dealer/DealerBidForm";

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
      "id, status, current_mileage, sale_timing, sale_reason, additional_notes, bidding_closes_at, created_at, vehicle:vehicles(manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, displacement_cc, options, damage_map, plate_number, color, interior_color, registered_at, vin, engine_code)",
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
    displacement_cc: number | null;
    options: string[] | null;
    damage_map: Record<string, string> | null;
    plate_number: string | null;
    color: string | null;
    interior_color: string | null;
    registered_at: string | null;
    vin: string | null;
    engine_code: string | null;
  } | null;

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

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">차량 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">연료</dt>
          <dd className="text-right">{v?.fuel_type ?? "-"}</dd>
          <dt className="text-muted">변속기</dt>
          <dd className="text-right">{v?.transmission ?? "-"}</dd>
          <dt className="text-muted">배기량</dt>
          <dd className="text-right">{v?.displacement_cc ? `${v.displacement_cc}cc` : "-"}</dd>
          <dt className="text-muted">차체</dt>
          <dd className="text-right">{v?.body_type ?? "-"}</dd>
          {v?.color && (<><dt className="text-muted">외장</dt><dd className="text-right">{v.color}</dd></>)}
          {v?.interior_color && (<><dt className="text-muted">내장</dt><dd className="text-right">{v.interior_color}</dd></>)}
          {v?.registered_at && (<><dt className="text-muted">최초등록</dt><dd className="text-right">{v.registered_at}</dd></>)}
          {v?.engine_code && (<><dt className="text-muted">원동기</dt><dd className="text-right">{v.engine_code}</dd></>)}
          {v?.vin && (<><dt className="text-muted">차대번호</dt><dd className="text-right">{v.vin}</dd></>)}
        </dl>
      </Card>

      {damageEntries.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">외판 상태</CardTitle>
          <ul className="flex flex-wrap gap-1">
            {damageEntries.map(([part, s]) => (
              <li key={part} className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                {part} · {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {v?.options && v.options.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">옵션</CardTitle>
          <p className="text-xs text-muted">{v.options.join(" · ")}</p>
        </Card>
      )}

      {sale.additional_notes && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">차주 메모</CardTitle>
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
