import Link from "next/link";
import { Plus, Car, ChevronRight } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatMileage, formatDate } from "@/lib/utils/format";

type VehicleRow = {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  mileage: number;
  trim: string | null;
  plate_number: string | null;
  status: string | null;
  sold_at: string | null;
};

export default async function GaragePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicles } = user
    ? await supabase
        .from("vehicles")
        .select(
          "id, manufacturer, model, year, mileage, trim, plate_number, status, sold_at",
        )
        .eq("user_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
    : { data: null };

  const all = (vehicles ?? []) as VehicleRow[];
  const active = all.filter((v) => (v.status ?? "active") === "active");
  const sold = all.filter((v) => v.status === "sold");

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

      {active.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {active.map((v) => (
            <li key={v.id}>
              <VehicleRowCard v={v} />
            </li>
          ))}
        </ul>
      ) : sold.length === 0 ? (
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
      ) : (
        <Card className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
          활성 차량이 없습니다. 새 차량을 등록해 보세요.
        </Card>
      )}

      {sold.length > 0 && (
        <section className="mt-2 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            지난 차량 ({sold.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {sold.map((v) => (
              <li key={v.id}>
                <VehicleRowCard v={v} muted />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VehicleRowCard({ v, muted }: { v: VehicleRow; muted?: boolean }) {
  return (
    <Link href={`/vehicles/${v.id}`}>
      <Card
        className={`flex items-center justify-between gap-3 ${muted ? "opacity-70" : ""}`}
      >
        <div className="flex flex-col gap-1">
          {v.plate_number && (
            <span
              className={`self-start rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${
                muted
                  ? "bg-muted/10 text-muted"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {v.plate_number}
            </span>
          )}
          <CardTitle>
            {v.manufacturer} {v.model}
            {v.trim ? ` · ${v.trim}` : ""}
          </CardTitle>
          <CardDescription>
            {v.year}년식 · {formatMileage(v.mileage)}
            {muted && v.sold_at ? ` · 매각 ${formatDate(v.sold_at)}` : ""}
          </CardDescription>
        </div>
        <ChevronRight className="h-5 w-5 text-muted" />
      </Card>
    </Link>
  );
}
