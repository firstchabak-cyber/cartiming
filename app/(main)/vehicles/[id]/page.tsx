import Link from "next/link";
import { notFound } from "next/navigation";
import { History, LineChart, Pencil, Wallet } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteVehicleButton } from "@/components/vehicle/DeleteVehicleButton";
import { MarkAsSoldButton } from "@/components/vehicle/MarkAsSoldButton";
import { RestoreVehicleButton } from "@/components/vehicle/RestoreVehicleButton";
import { ExternalSaleButton } from "@/components/sale/ExternalSaleButton";
import { PhotoGallery } from "@/components/vehicle/PhotoGallery";
import {
  BODY_TYPE_LABELS,
  VEHICLE_CLASS_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  type BodyType,
  type VehicleClass,
} from "@/lib/constants/vehicle";
import { createClient } from "@/lib/supabase/server";
import { formatKRW, formatDate, formatMileage } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  balanceAfterMonths,
  monthlyPayment,
  monthsBetween,
  type LoanInfo,
} from "@/lib/utils/loan";

const SIGNAL_META: Record<
  "sell_now" | "review" | "hold",
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  sell_now: { label: "매각 적기", tone: "success" },
  review: { label: "관망", tone: "warning" },
  hold: { label: "보유 유지", tone: "neutral" },
};

export default async function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, color, interior_color, plate_number, registered_at, vin, displacement_cc, body_type, vehicle_class, engine_code, inspection_valid_until, seating_capacity, key_count, wheel_scuff_count, options, status, sold_at, loan_principal, loan_started_at, loan_months, loan_apr",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

  const loan: LoanInfo | null =
    vehicle.loan_principal != null &&
    vehicle.loan_started_at &&
    vehicle.loan_months != null &&
    vehicle.loan_apr != null
      ? {
          principal: vehicle.loan_principal,
          startedAt: vehicle.loan_started_at,
          months: vehicle.loan_months,
          apr: vehicle.loan_apr,
        }
      : null;

  const today = new Date().toISOString().slice(0, 10);
  const elapsed = loan ? Math.max(0, monthsBetween(loan.startedAt, today)) : 0;
  const currentBalance = loan
    ? Math.round(balanceAfterMonths(loan, elapsed))
    : null;
  const monthly = loan ? Math.round(monthlyPayment(loan)) : null;
  const remainingMonths = loan ? Math.max(0, loan.months - elapsed) : null;

  const { data: analysisRows } = await supabase
    .from("price_analyses")
    .select("current_price, predicted_6m, signal, rationale, generated_at")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false });

  const analyses = (analysisRows ?? []).map((a) => ({
    ...a,
    signal: a.signal as "sell_now" | "review" | "hold",
  }));

  // 진행 중인 매각 신청 (있으면 진행상황·사진 페이지로 다시 갈 수 있게 안내)
  const { data: activeSale } = await supabase
    .from("sale_requests")
    .select("id, status")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", user.id)
    .in("status", ["pending", "bidding", "matched"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const SALE_STATUS_LABEL: Record<string, string> = {
    pending: "관리자 검토 중",
    bidding: "입찰 진행 중",
    matched: "딜러 선택 완료",
  };

  const latestAnalysis = analyses[0] ?? null;

  const { data: photoRows } = await supabase
    .from("vehicle_photos")
    .select("id, storage_path, sort_order")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  const photos = await Promise.all(
    (photoRows ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("vehicle-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { id: p.id, signed_url: data?.signedUrl ?? "" };
    }),
  );

  const isSold = vehicle.status === "sold";
  const carLabel = `${vehicle.manufacturer} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {isSold && (
            <Badge tone="neutral">
              매각 완료 {vehicle.sold_at ? `· ${formatDate(vehicle.sold_at)}` : ""}
            </Badge>
          )}
          <h1 className="text-xl font-bold">
            {vehicle.manufacturer} {vehicle.model}
            {vehicle.trim ? ` ${vehicle.trim}` : ""}
          </h1>
          <p className="text-sm text-muted">
            {vehicle.year}년식 · {formatMileage(vehicle.mileage)}
          </p>
        </div>
        <div className="flex gap-2">
          {!isSold && (
            <Link href={`/vehicles/${vehicle.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                수정
              </Button>
            </Link>
          )}
          {isSold && <RestoreVehicleButton vehicleId={vehicle.id} />}
          <DeleteVehicleButton
            vehicleId={vehicle.id}
            label={`${vehicle.manufacturer} ${vehicle.model}`}
          />
        </div>
      </header>

      {!isSold && activeSale && (
        <Card className="flex flex-col gap-2 border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              💼 매각 신청 진행 중
            </p>
            <Badge tone="warning">
              {SALE_STATUS_LABEL[activeSale.status] ?? activeSale.status}
            </Badge>
          </div>
          <p className="text-xs text-muted">
            진행상황 확인과 차량 사진 추가는 아래 버튼에서 하실 수 있어요.
            사진이 많을수록 딜러 입찰가가 올라갑니다.
          </p>
          <Link href={`/sales/${activeSale.id}`}>
            <Button fullWidth>📸 진행상황 보기 · 사진 추가</Button>
          </Link>
        </Card>
      )}

      {!isSold && !activeSale && (
        <Card className="flex flex-col gap-2 border-primary/30 bg-primary/5">
          <p className="text-sm font-semibold text-foreground">매각하기</p>
          <p className="text-xs text-muted">
            카타임에서 매각하면 <strong>영구 무료 슬롯 +1</strong> · 외부에서 매각하면
            가격 신고로 다른 사용자 시세 분석에 기여.
          </p>
          <Link href={`/vehicles/${vehicle.id}/sell`}>
            <Button fullWidth>💼 카타임에서 매각 신청</Button>
          </Link>
          <ExternalSaleButton vehicleId={vehicle.id} />
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-muted">
              그냥 매각 완료로만 표시 (슬롯 회복 없음)
            </summary>
            <div className="mt-2">
              <MarkAsSoldButton vehicleId={vehicle.id} carLabel={carLabel} />
            </div>
          </details>
        </Card>
      )}

      {photos.length > 0 && <PhotoGallery photos={photos} />}

      <Card className="flex flex-col gap-2">
        <CardTitle>기본 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">제조사</dt>
          <dd className="text-right">{vehicle.manufacturer}</dd>
          <dt className="text-muted">모델</dt>
          <dd className="text-right">{vehicle.model}</dd>
          {vehicle.trim && (
            <>
              <dt className="text-muted">트림</dt>
              <dd className="text-right">{vehicle.trim}</dd>
            </>
          )}
          <dt className="text-muted">연식</dt>
          <dd className="text-right">{vehicle.year}년</dd>
          <dt className="text-muted">주행거리</dt>
          <dd className="text-right">{formatMileage(vehicle.mileage)}</dd>
          {vehicle.fuel_type && (
            <>
              <dt className="text-muted">연료</dt>
              <dd className="text-right">
                {FUEL_LABELS[vehicle.fuel_type] ?? vehicle.fuel_type}
              </dd>
            </>
          )}
          {vehicle.transmission && (
            <>
              <dt className="text-muted">변속기</dt>
              <dd className="text-right">
                {TRANSMISSION_LABELS[vehicle.transmission] ??
                  vehicle.transmission}
              </dd>
            </>
          )}
          {vehicle.color && (
            <>
              <dt className="text-muted">외장 색상</dt>
              <dd className="text-right">{vehicle.color}</dd>
            </>
          )}
          {vehicle.interior_color && (
            <>
              <dt className="text-muted">내장 색상</dt>
              <dd className="text-right">{vehicle.interior_color}</dd>
            </>
          )}
          {vehicle.plate_number && (
            <>
              <dt className="text-muted">번호판</dt>
              <dd className="text-right">{vehicle.plate_number}</dd>
            </>
          )}
          {vehicle.key_count != null && (
            <>
              <dt className="text-muted">자동차키</dt>
              <dd className="text-right">
                {vehicle.key_count >= 3 ? "3개 이상" : `${vehicle.key_count}개`}
              </dd>
            </>
          )}
          {vehicle.wheel_scuff_count != null &&
            vehicle.wheel_scuff_count > 0 && (
              <>
                <dt className="text-muted">휠 기스</dt>
                <dd className="text-right">{vehicle.wheel_scuff_count}개</dd>
              </>
            )}
        </dl>
      </Card>

      {(vehicle.vin ||
        vehicle.displacement_cc ||
        vehicle.body_type ||
        vehicle.vehicle_class ||
        vehicle.engine_code ||
        vehicle.seating_capacity ||
        vehicle.inspection_valid_until) && (
        <Card className="flex flex-col gap-2">
          <CardTitle>등록증 정보</CardTitle>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            {vehicle.vehicle_class && (
              <>
                <dt className="text-muted">차종</dt>
                <dd className="text-right">
                  {VEHICLE_CLASS_LABELS[vehicle.vehicle_class as VehicleClass] ??
                    vehicle.vehicle_class}
                </dd>
              </>
            )}
            {vehicle.body_type && (
              <>
                <dt className="text-muted">차체 형상</dt>
                <dd className="text-right">
                  {BODY_TYPE_LABELS[vehicle.body_type as BodyType] ??
                    vehicle.body_type}
                </dd>
              </>
            )}
            {vehicle.displacement_cc != null && (
              <>
                <dt className="text-muted">배기량</dt>
                <dd className="text-right">
                  {vehicle.displacement_cc.toLocaleString("ko-KR")} cc
                </dd>
              </>
            )}
            {vehicle.engine_code && (
              <>
                <dt className="text-muted">원동기 형식</dt>
                <dd className="text-right">{vehicle.engine_code}</dd>
              </>
            )}
            {vehicle.seating_capacity != null && (
              <>
                <dt className="text-muted">승차 정원</dt>
                <dd className="text-right">{vehicle.seating_capacity}명</dd>
              </>
            )}
            {vehicle.vin && (
              <>
                <dt className="text-muted">차대번호</dt>
                <dd className="break-all text-right font-mono text-xs">
                  {vehicle.vin}
                </dd>
              </>
            )}
            {vehicle.inspection_valid_until && (
              <>
                <dt className="text-muted">검사 유효</dt>
                <dd className="text-right">
                  {formatDate(vehicle.inspection_valid_until)}
                </dd>
              </>
            )}
            <dt className="text-muted">최초 등록일</dt>
            <dd className="text-right">{formatDate(vehicle.registered_at)}</dd>
          </dl>
        </Card>
      )}

      {vehicle.options && vehicle.options.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle>옵션</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {(vehicle.options as string[]).map((opt) => (
              <Badge key={opt} tone="neutral">
                {opt}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {loan && currentBalance != null && monthly != null && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">대출 현황</CardTitle>
          </div>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">원금</dt>
            <dd className="text-right">{formatKRW(loan.principal)}</dd>
            <dt className="text-muted">월 납입금</dt>
            <dd className="text-right">{formatKRW(monthly)}</dd>
            <dt className="text-muted">현재 잔액</dt>
            <dd className="text-right font-semibold">
              {formatKRW(currentBalance)}
            </dd>
            <dt className="text-muted">남은 기간</dt>
            <dd className="text-right">{remainingMonths}개월</dd>
          </dl>
        </Card>
      )}

      {latestAnalysis ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>최근 시세 분석</CardTitle>
            <Badge tone={SIGNAL_META[latestAnalysis.signal].tone}>
              {SIGNAL_META[latestAnalysis.signal].label}
            </Badge>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatKRW(latestAnalysis.current_price)}
          </p>
          {currentBalance != null && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="text-muted">지금 매각 시 순수령액</span>
              <span
                className={cn(
                  "font-bold",
                  latestAnalysis.current_price - currentBalance < 0
                    ? "text-danger"
                    : "text-success",
                )}
              >
                {formatKRW(latestAnalysis.current_price - currentBalance)}
              </span>
            </div>
          )}
          <CardDescription>{latestAnalysis.rationale}</CardDescription>
          <p className="text-xs text-muted">
            6개월 예상 {formatKRW(latestAnalysis.predicted_6m)} ·{" "}
            {formatDate(latestAnalysis.generated_at)} 기준
          </p>
          <Link href={`/analysis?vehicleId=${vehicle.id}`}>
            <Button variant="outline" fullWidth>
              <LineChart className="h-4 w-4" />
              다시 분석하기
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <CardTitle>시세 분석</CardTitle>
          <CardDescription>
            이 차량의 현재 시세와 향후 6개월 예상 시세를 AI로 분석해 드려요.
          </CardDescription>
          <Link href={`/analysis?vehicleId=${vehicle.id}`}>
            <Button fullWidth>
              <LineChart className="h-4 w-4" />
              AI 시세 분석 보기
            </Button>
          </Link>
        </Card>
      )}

      {analyses.length >= 2 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              시세 분석 기록 ({analyses.length}회)
            </CardTitle>
          </div>
          <ul className="flex flex-col gap-2">
            {analyses.map((a, i) => {
              const older = analyses[i + 1];
              const diff = older ? a.current_price - older.current_price : 0;
              const pct =
                older && older.current_price > 0
                  ? Math.round((Math.abs(diff) / older.current_price) * 1000) / 10
                  : 0;
              return (
                <li
                  key={a.generated_at}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {formatKRW(a.current_price)}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDate(a.generated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {older && diff !== 0 && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          diff > 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {diff > 0 ? "▲" : "▼"} {pct}%
                      </span>
                    )}
                    <Badge tone={SIGNAL_META[a.signal].tone}>
                      {SIGNAL_META[a.signal].label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted">
            매월 1일 자동 분석 + 직접 분석할 때마다 기록이 쌓입니다. 변동률은 직전
            기록 대비입니다.
          </p>
        </Card>
      )}

    </div>
  );
}
