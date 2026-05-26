import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceForm } from "@/components/vehicle/MaintenanceForm";

export default async function NewMaintenancePage({
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
    .select("id, manufacturer, model")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">정비/사고 이력 추가</h1>
        <p className="text-sm text-muted">
          {vehicle.manufacturer} {vehicle.model}
        </p>
      </header>
      <MaintenanceForm vehicleId={vehicle.id} />
    </div>
  );
}
