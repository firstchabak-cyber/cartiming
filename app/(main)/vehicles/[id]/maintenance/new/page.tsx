import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DamageMapEditor } from "@/components/vehicle/DamageMapEditor";
import type { DamageMap } from "@/lib/constants/damage";

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
    .select("id, manufacturer, model, damage_map")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) notFound();

  const initial =
    vehicle.damage_map && typeof vehicle.damage_map === "object"
      ? (vehicle.damage_map as DamageMap)
      : {};

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">외판 상태 (정비/사고 이력)</h1>
        <p className="text-sm text-muted">
          {vehicle.manufacturer} {vehicle.model}
        </p>
      </header>
      <DamageMapEditor vehicleId={vehicle.id} initial={initial} />
    </div>
  );
}
