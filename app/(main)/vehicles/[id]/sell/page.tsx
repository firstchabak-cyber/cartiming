import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SaleRequestForm } from "@/components/sale/SaleRequestForm";

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
    .select("id, manufacturer, model, trim, year, mileage, plate_number, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

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

      <SaleRequestForm
        vehicleId={vehicle.id}
        currentMileage={vehicle.mileage}
      />
    </div>
  );
}
