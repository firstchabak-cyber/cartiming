import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatMileage } from "@/lib/utils/format";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "🔴 승인 대기", tone: "danger" },
  bidding: { label: "입찰 중", tone: "warning" },
  matched: { label: "매칭됨", tone: "success" },
  completed: { label: "완료", tone: "neutral" },
  canceled: { label: "취소", tone: "danger" },
};

export default async function AdminSalesPage() {
  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("sale_requests")
    .select(
      "id, status, current_mileage, created_at, vehicle:vehicles(manufacturer, model, year, plate_number), user_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    status: string;
    current_mileage: number | null;
    created_at: string;
    vehicle: {
      manufacturer: string;
      model: string;
      year: number;
      plate_number: string | null;
    } | null;
    user_id: string;
  };
  const list = (requests as Row[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">매각 신청 관리</h1>
        <p className="text-sm text-muted">전체 {list.length}건</p>
      </header>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>신청이 없습니다.</CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            const v = r.vehicle;
            return (
              <li key={r.id}>
                <Link href={`/admin/sales/${r.id}`}>
                  <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-surface">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {v?.plate_number && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                            {v.plate_number}
                          </span>
                        )}
                      </div>
                      <CardTitle>
                        {v?.manufacturer} {v?.model} ({v?.year}년식)
                      </CardTitle>
                      <CardDescription>
                        {formatMileage(r.current_mileage ?? 0)} ·{" "}
                        {formatDate(r.created_at)}
                      </CardDescription>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
