import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatKRW, formatMileage } from "@/lib/utils/format";
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_CLASS_LABELS,
  type BodyType,
  type VehicleClass,
} from "@/lib/constants/vehicle";

export const dynamic = "force-dynamic";

type Vehicle = {
  id: string;
  user_id: string;
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
  color: string | null;
  interior_color: string | null;
  plate_number: string | null;
  registered_at: string | null;
  vin: string | null;
  status: string;
  sold_at: string | null;
  created_at: string;
};

type Maintenance = {
  id: string;
  category: string;
  part: string | null;
  description: string | null;
  performed_at: string | null;
  cost: number | null;
};

type Analysis = {
  current_price: number;
  signal: string;
  generated_at: string;
};

type SaleReq = {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export default async function AdminVehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select(
      "id, user_id, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, vehicle_class, displacement_cc, color, interior_color, plate_number, registered_at, vin, status, sold_at, created_at",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!vehicle) notFound();

  const v = vehicle as Vehicle;

  // 차주 정보
  const { data: ownerRes } = await admin.auth.admin.getUserById(v.user_id);
  const owner = ownerRes?.user;
  const ownerName =
    (owner?.user_metadata?.name as string | undefined) ?? owner?.email ?? "—";

  const [
    { data: maint },
    { data: analyses },
    { data: sales },
    { data: photos },
  ] = await Promise.all([
    admin
      .from("vehicle_maintenance")
      .select("id, category, part, description, performed_at, cost")
      .eq("vehicle_id", v.id)
      .order("performed_at", { ascending: false })
      .limit(20),
    admin
      .from("price_analyses")
      .select("current_price, signal, generated_at")
      .eq("vehicle_id", v.id)
      .order("generated_at", { ascending: false })
      .limit(5),
    admin
      .from("sale_requests")
      .select("id, status, created_at, completed_at")
      .eq("vehicle_id", v.id)
      .order("created_at", { ascending: false }),
    admin
      .from("vehicle_photos")
      .select("storage_path")
      .eq("vehicle_id", v.id)
      .order("sort_order", { ascending: true })
      .limit(10),
  ]);

  const maintList = (maint ?? []) as Maintenance[];
  const analysisList = (analyses ?? []) as Analysis[];
  const salesList = (sales ?? []) as SaleReq[];
  const latest = analysisList[0];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link
          href={`/admin/users/${v.user_id}`}
          className="text-xs text-primary hover:underline"
        >
          ← {ownerName} 고객 페이지로
        </Link>
        <div className="mt-2 flex items-center gap-2">
          {v.plate_number && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold text-primary">
              {v.plate_number}
            </span>
          )}
          <h1 className="text-xl font-bold text-foreground">
            {v.manufacturer} {v.model}
            {v.trim ? ` · ${v.trim}` : ""}
          </h1>
          <Badge tone={v.status === "sold" ? "neutral" : "success"}>
            {v.status === "sold" ? "매각 완료" : "활성"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {v.year}년식 · {formatMileage(v.mileage)}
          {v.sold_at && ` · 매각 ${formatDate(v.sold_at)}`}
        </p>
      </header>

      {/* 차량 기본 정보 */}
      <Card>
        <CardTitle>차량 정보</CardTitle>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          {v.fuel_type && (
            <>
              <dt className="text-muted">연료</dt>
              <dd className="text-right">
                {FUEL_LABELS[v.fuel_type as keyof typeof FUEL_LABELS] ?? v.fuel_type}
              </dd>
            </>
          )}
          {v.transmission && (
            <>
              <dt className="text-muted">변속기</dt>
              <dd className="text-right">
                {TRANSMISSION_LABELS[v.transmission as keyof typeof TRANSMISSION_LABELS] ??
                  v.transmission}
              </dd>
            </>
          )}
          {v.body_type && (
            <>
              <dt className="text-muted">차종</dt>
              <dd className="text-right">
                {BODY_TYPE_LABELS[v.body_type as BodyType] ?? v.body_type}
              </dd>
            </>
          )}
          {v.vehicle_class && (
            <>
              <dt className="text-muted">차급</dt>
              <dd className="text-right">
                {VEHICLE_CLASS_LABELS[v.vehicle_class as VehicleClass] ??
                  v.vehicle_class}
              </dd>
            </>
          )}
          {v.displacement_cc && (
            <>
              <dt className="text-muted">배기량</dt>
              <dd className="text-right">
                {v.displacement_cc.toLocaleString("ko-KR")} cc
              </dd>
            </>
          )}
          {v.color && (
            <>
              <dt className="text-muted">외장색</dt>
              <dd className="text-right">{v.color}</dd>
            </>
          )}
          {v.interior_color && (
            <>
              <dt className="text-muted">내장색</dt>
              <dd className="text-right">{v.interior_color}</dd>
            </>
          )}
          {v.registered_at && (
            <>
              <dt className="text-muted">최초 등록</dt>
              <dd className="text-right">{v.registered_at}</dd>
            </>
          )}
          {v.vin && (
            <>
              <dt className="text-muted">차대번호</dt>
              <dd className="text-right font-mono text-xs">{v.vin}</dd>
            </>
          )}
          <dt className="text-muted">시스템 등록일</dt>
          <dd className="text-right">{formatDate(v.created_at)}</dd>
        </dl>
      </Card>

      {/* 최근 분석 */}
      <Card>
        <CardTitle>시세 분석 ({analysisList.length}건)</CardTitle>
        {latest ? (
          <>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatKRW(latest.current_price)}
            </p>
            <p className="text-xs text-muted">
              {formatDate(latest.generated_at)} · 신호: {latest.signal}
            </p>
            {analysisList.length > 1 && (
              <ul className="mt-2 flex flex-col gap-1 text-[11px] text-muted">
                {analysisList.slice(1).map((a, i) => (
                  <li key={i}>
                    {formatDate(a.generated_at)} — {formatKRW(a.current_price)} (
                    {a.signal})
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <CardDescription className="mt-2">분석 이력 없음</CardDescription>
        )}
      </Card>

      {/* 매각 신청 */}
      <Card>
        <CardTitle>매각 신청 ({salesList.length}건)</CardTitle>
        {salesList.length === 0 ? (
          <CardDescription className="mt-2">없음</CardDescription>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {salesList.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="text-foreground">{s.status}</span>
                  <span className="ml-2 text-muted">{formatDate(s.created_at)}</span>
                  {s.completed_at && (
                    <span className="ml-2 text-muted">
                      → 완료 {formatDate(s.completed_at)}
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/sales/${s.id}`}
                  className="text-primary hover:underline"
                >
                  상세 →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 정비 이력 */}
      <Card>
        <CardTitle>정비·사고 이력 ({maintList.length}건)</CardTitle>
        {maintList.length === 0 ? (
          <CardDescription className="mt-2">없음</CardDescription>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {maintList.map((m) => (
              <li key={m.id} className="flex flex-col gap-0.5 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {m.category} {m.part ? `· ${m.part}` : ""}
                  </span>
                  {m.cost && (
                    <span className="text-muted">{formatKRW(m.cost)}</span>
                  )}
                </div>
                {m.description && (
                  <p className="text-muted">{m.description}</p>
                )}
                {m.performed_at && (
                  <p className="text-[10px] text-muted">{m.performed_at}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 사진 (없을 수도) */}
      {(photos?.length ?? 0) > 0 && (
        <Card>
          <CardTitle>차량 사진</CardTitle>
          <p className="mt-2 text-xs text-muted">
            {photos!.length}장 — Supabase Storage 의 vehicle-photos 버킷
          </p>
        </Card>
      )}
    </div>
  );
}
