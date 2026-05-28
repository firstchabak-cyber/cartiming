import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { isAdmin } from "@/lib/admin/check";
import { formatDate, formatMileage } from "@/lib/utils/format";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "신규", tone: "warning" },
  bidding: { label: "입찰 중", tone: "warning" },
  matched: { label: "매칭됨", tone: "success" },
  completed: { label: "완료", tone: "neutral" },
  canceled: { label: "취소", tone: "danger" },
};

export default async function AdminSalesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <Card className="p-8 text-center">
        <CardTitle>접근 권한이 없습니다</CardTitle>
        <CardDescription>운영자만 접근 가능한 페이지입니다.</CardDescription>
      </Card>
    );
  }

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("sale_requests")
    .select(
      "id, status, current_mileage, created_at, vehicle:vehicles(manufacturer, model, year, plate_number), user_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">매각 신청 관리</h1>
        <Link href="/admin/dealers" className="text-xs text-primary underline">
          딜러 관리 →
        </Link>
      </header>

      {(requests ?? []).length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>신청이 없습니다.</CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(requests as Array<{
            id: string;
            status: string;
            current_mileage: number | null;
            created_at: string;
            vehicle: { manufacturer: string; model: string; year: number; plate_number: string | null } | null;
            user_id: string;
          }>).map((r) => {
            const v = r.vehicle as unknown as {
              manufacturer: string;
              model: string;
              year: number;
              plate_number: string | null;
            } | null;
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            return (
              <li key={r.id}>
                <Link href={`/admin/sales/${r.id}`}>
                  <Card className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-xs text-muted">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    {v?.plate_number && (
                      <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {v.plate_number}
                      </span>
                    )}
                    <CardTitle>
                      {v?.manufacturer} {v?.model} ({v?.year}년식)
                    </CardTitle>
                    <CardDescription>
                      {formatMileage(r.current_mileage ?? 0)}
                    </CardDescription>
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
