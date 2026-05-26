import { VehicleForm } from "@/components/vehicle/VehicleForm";

export default function NewVehiclePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">차량 등록</h1>
      <VehicleForm mode="new" />
    </div>
  );
}
