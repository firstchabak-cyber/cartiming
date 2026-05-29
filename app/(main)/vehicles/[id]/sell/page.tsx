import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SaleRequestForm } from "@/components/sale/SaleRequestForm";
import { isSupercarBrand } from "@/lib/constants/vehicle";

export default async function SellVehiclePage({
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
      "id, manufacturer, model, trim, year, mileage, plate_number, status, fuel_type, transmission, body_type, vehicle_class",
    )
    // 슈퍼카 옵션표 사진 필수 판정용
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

  // 슈퍼카 브랜드는 옵션표 사진 1장 이상 필수
  const requireOptionSheet = isSupercarBrand(vehicle.manufacturer);

  // 딜러가 입찰가 산정에 꼭 필요한 핵심 정보 누락 확인
  const missing: string[] = [];
  if (!vehicle.fuel_type) missing.push("연료");
  if (!vehicle.transmission) missing.push("변속기");
  if (!vehicle.body_type) missing.push("차체 형상");
  if (!vehicle.vehicle_class) missing.push("차종");

  if (vehicle.status !== "active") {
    return (
      <div className="flex flex-col gap-3 p-2">
        <h1 className="text-xl font-bold">매각 신청</h1>
        <p className="text-sm text-danger">
          이 차량은 이미 매각 처리되었거나 활성 상태가 아닙니다.
        </p>
        <Link href={`/vehicles/${vehicle.id}`} className="text-sm text-primary underline">
          ← 차량 상세로 돌아가기
        </Link>
      </div>
    );
  }

  // 이미 진행중인 신청이 있는지
  const { data: existing } = await supabase
    .from("sale_requests")
    .select("id, status")
    .eq("vehicle_id", vehicle.id)
    .in("status", ["pending", "bidding", "matched"])
    .maybeSingle();

  if (existing) {
    return (
      <div className="flex flex-col gap-3 p-2">
        <h1 className="text-xl font-bold">매각 신청</h1>
        <p className="text-sm text-muted">
          이미 진행 중인 매각 신청이 있습니다.
        </p>
        <Link
          href={`/sales/${existing.id}`}
          className="text-sm text-primary underline"
        >
          → 진행 상황 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">매각 신청</h1>
        <p className="text-sm text-muted">
          {vehicle.plate_number ? `[${vehicle.plate_number}] ` : ""}
          {vehicle.manufacturer} {vehicle.model}
          {vehicle.trim ? ` ${vehicle.trim}` : ""} ({vehicle.year}년식)
        </p>
      </header>

      {missing.length > 0 && (
        <div className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">
            ⚠️ 차량 정보가 부족합니다: {missing.join(", ")}
          </p>
          <p className="mt-1 text-xs text-foreground">
            딜러가 정확한 입찰가를 산정하려면 위 항목들이 채워져야 합니다.
            지금 매각 신청은 가능하지만, 정확한 입찰가를 받으시려면 먼저 차량 정보를
            보완하시는 것을 강력히 권장합니다.
          </p>
          <Link
            href={`/vehicles/${vehicle.id}/edit`}
            className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
          >
            → 차량 정보 수정하러 가기
          </Link>
        </div>
      )}

      <SaleRequestForm
        vehicleId={vehicle.id}
        currentMileage={vehicle.mileage}
        requireOptionSheet={requireOptionSheet}
      />
    </div>
  );
}
