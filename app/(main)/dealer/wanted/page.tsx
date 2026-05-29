import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  type WantedRow,
  WANTED_STATUS_LABEL,
  conditionSummary,
  deadlineInfo,
} from "@/lib/wanted/format";
import { WantedCloseButton } from "@/components/dealer/WantedCloseButton";

export const dynamic = "force-dynamic";

export default async function DealerWantedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dealer/login");

  const { data: dealer } = await supabase
    .from("dealers")
    .select("user_id, business_name, verified")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) redirect("/dealer/register");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("dealer_wanted")
    .select("*")
    .eq("dealer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (rows as WantedRow[]) ?? [];
  const now = Date.now();

  const statusTone: Record<string, "primary" | "success" | "warning" | "neutral" | "danger"> = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    expired: "neutral",
    closed: "neutral",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">내 구매요청</h1>
          <p className="text-xs text-muted">
            구하는 차량을 등록하면 조건 맞는 차주에게 알림이 갑니다
          </p>
        </div>
        {!dealer.verified && <Badge tone="warning">인증 대기</Badge>}
      </header>

      {dealer.verified ? (
        <Link
          href="/dealer/wanted/new"
          className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white"
        >
          + 구매요청 등록
        </Link>
      ) : (
        <Card className="border-warning bg-warning/5">
          <CardDescription>
            ⏳ 운영자 인증 완료 후 구매요청을 등록할 수 있습니다.
          </CardDescription>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            아직 등록한 구매요청이 없습니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((w) => {
            const dl = deadlineInfo(w.expires_at, now);
            const isActive = w.status === "approved" || w.status === "pending";
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
                {w.memo && (
                  <p className="text-xs text-foreground">💬 {w.memo}</p>
                )}
                <div className="flex items-center justify-between">
                  <Badge
                    tone={
                      dl.tone === "expired"
                        ? "neutral"
                        : dl.tone === "urgent"
                          ? "danger"
                          : "primary"
                    }
                  >
                    {dl.label}
                  </Badge>
                  {isActive && <WantedCloseButton id={w.id} />}
                </div>
                {w.status === "rejected" && w.reject_reason && (
                  <p className="text-xs text-danger">반려 사유: {w.reject_reason}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
