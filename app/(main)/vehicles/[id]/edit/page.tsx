import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { VehicleForm } from "@/components/vehicle/VehicleForm";
import { PhotoUploader } from "@/components/vehicle/PhotoUploader";

export default async function VehicleEditPage({
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
      "id, manufacturer, model, trim, year, mileage, registered_at, fuel_type, transmission, color, interior_color, plate_number, vin, displacement_cc, body_type, vehicle_class, engine_code, inspection_valid_until, seating_capacity, options, loan_principal, loan_started_at, loan_months, loan_apr",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

  const { data: photos } = await supabase
    .from("vehicle_photos")
    .select("id, storage_path, sort_order")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("vehicle-photos")
        .createSignedUrl(p.storage_path, 3600);
      return {
        id: p.id,
        storage_path: p.storage_path,
        sort_order: p.sort_order,
        signed_url: data?.signedUrl ?? "",
      };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">차량 정보 수정</h1>

      <Card className="flex flex-col gap-3">
        <CardTitle>차량 사진</CardTitle>
        <PhotoUploader vehicleId={vehicle.id} initialPhotos={signed} />
      </Card>

      <VehicleForm mode="edit" vehicle={vehicle} />
    </div>
  );
}
