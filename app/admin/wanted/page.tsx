import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  type WantedRow,
  WANTED_STATUS_LABEL,
  conditionSummary,
  deadlineInfo,
} from "@/lib/wanted/format";
import { WantedApproveButtons } from "@/components/admin/WantedApproveButtons";
import { WantedEditForm } from "@/components/admin/WantedEditForm";

export const dynamic = "force-dynamic";

export default async function AdminWantedPage() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("dealer_wanted")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (rows as WantedRow[]) ?? [];
  const now = Date.now();
  const pending = list.filter((w) => w.status === "pending");
  const others = list.filter((w) => w.status !== "pending");

  const statusTone: Record<string, "primary" | "success" | "warning" | "neutral" | "danger"> = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    expired: "neutral",
    closed: "neutral",
  };

  const renderCard = (w: WantedRow) => {
    const dl = deadlineInfo(w.expires_at, now);
    return (
      <Card key={w.id} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>
            {w.manufacturer} {w.model}
          </CardTitle>
          <Badge tone={statusTone[w.status] ?? "neutral"}>
            {WANTED_STATUS_LABEL[w.status] ?? w.status}
          </Badge>
        </div>
        <p className="text-xs text-muted">{conditionSummary(w)}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>딜러: {w.dealer_name}</span>
          <span>기간: {dl.label}</span>
          <span>등록: {w.created_at.slice(0, 10)}</span>
        </div>
        {w.memo && <p className="text-xs text-foreground">💬 {w.memo}</p>}
        <WantedEditForm
          wanted={{
            id: w.id,
            manufacturer: w.manufacturer,
            model: w.model,
            year_min: w.year_min,
            year_max: w.year_max,
            max_mileage: w.max_mileage,
            max_price: w.max_price == null ? null : Number(w.max_price),
            region: w.region,
            memo: w.memo,
          }}
        />
        {w.status === "pending" && <WantedApproveButtons id={w.id} />}
        {w.status === "rejected" && w.reject_reason && (
          <p className="text-xs text-danger">반려 사유: {w.reject_reason}</p>
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">딜러 구매요청 승인</h1>
        <p className="text-sm text-muted">
          딜러가 구하는 차량을 검수하고 승인합니다. 승인 시 조건 맞는 차주에게
          알림이 자동 발송됩니다.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-warning">
          🔔 승인 대기 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="py-6 text-center">
            <CardDescription>대기 중인 구매요청이 없습니다.</CardDescription>
          </Card>
        ) : (
          pending.map(renderCard)
        )}
      </section>

      {others.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">처리 내역</h2>
          {others.map(renderCard)}
        </section>
      )}
    </div>
  );
}
