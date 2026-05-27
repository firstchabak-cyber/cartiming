import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AnalysisClient } from "@/components/analysis/AnalysisClient";

export default async function AnalysisPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicles } = user
    ? await supabase
        .from("vehicles")
        .select("id, manufacturer, model, trim, year, mileage, plate_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">시세 분석</h1>
      <Suspense fallback={null}>
        <AnalysisClient vehicles={vehicles ?? []} />
      </Suspense>
    </div>
  );
}
