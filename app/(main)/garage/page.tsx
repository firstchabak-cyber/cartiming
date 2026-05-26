import Link from "next/link";
import { Plus, Car, ChevronRight } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatMileage } from "@/lib/utils/format";

export default async function GaragePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicles } = user
    ? await supabase
        .from("vehicles")
        .select("id, manufacturer, model, year, mileage, trim")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  const hasVehicles = (vehicles?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 차고</h1>
        <Link href="/vehicles/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />등록
          </Button>
        </Link>
      </header>

      {hasVehicles ? (
        <ul className="flex flex-col gap-3">
          {vehicles!.map((v) => (
            <li key={v.id}>
              <Link href={`/vehicles/${v.id}`}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>
                      {v.manufacturer} {v.model}
                      {v.trim ? ` ${v.trim}` : ""}
                    </CardTitle>
                    <CardDescription>
                      {v.year}년식 · {formatMileage(v.mileage)}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Car className="h-10 w-10 text-muted" />
          <CardTitle>등록된 차량이 없습니다</CardTitle>
          <CardDescription>
            차량을 등록하면 시세 분석과 매각 알림을 받을 수 있어요.
          </CardDescription>
          <Link href="/vehicles/new" className="mt-2">
            <Button>첫 차량 등록하기</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
