import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  admin_email: string | null;
  target_type: string;
  target_id: string;
  target_label: string | null;
  reason: string;
  created_at: string;
};

const TYPE_META: Record<
  string,
  { label: string; tone: "primary" | "warning" | "danger" | "neutral" }
> = {
  user: { label: "고객", tone: "danger" },
  dealer: { label: "딜러", tone: "warning" },
  vehicle: { label: "차량", tone: "primary" },
};

export default async function AdminDeletionLogPage() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("admin_deletion_log")
    .select(
      "id, admin_email, target_type, target_id, target_label, reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const list = (rows as LogRow[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">삭제 이력</h1>
        <p className="text-sm text-muted">
          고객·딜러·차량을 삭제한 기록입니다. (누가·무엇을·언제·왜) 총{" "}
          {list.length}건
        </p>
      </header>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>아직 삭제 이력이 없습니다.</CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => {
            const meta = TYPE_META[r.target_type] ?? {
              label: r.target_type,
              tone: "neutral" as const,
            };
            return (
              <li key={r.id}>
                <Card className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label} 삭제</Badge>
                      <CardTitle className="text-sm">
                        {r.target_label ?? r.target_id}
                      </CardTitle>
                    </div>
                    <span className="text-[11px] text-muted">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="text-muted">사유:</span> {r.reason}
                  </p>
                  <p className="text-[11px] text-muted">
                    처리자: {r.admin_email ?? "-"} · 대상 ID: {r.target_id}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
