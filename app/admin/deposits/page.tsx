import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DepositActions } from "@/components/admin/DepositActions";
import { bankAccountLine } from "@/lib/payments/bank";
import { DEPOSIT_STATUS } from "@/lib/payments/depositStatus";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  amount_krw: number;
  credits: number;
  depositor_name: string;
  status: "pending" | "confirmed" | "rejected";
  admin_note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDepositsPage() {
  const admin = createAdminClient();

  const [{ data: pending }, { data: processed }] = await Promise.all([
    admin
      .from("deposit_requests")
      .select(
        "id, user_id, amount_krw, credits, depositor_name, status, admin_note, processed_by, processed_at, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("deposit_requests")
      .select(
        "id, user_id, amount_krw, credits, depositor_name, status, admin_note, processed_by, processed_at, created_at",
      )
      .in("status", ["confirmed", "rejected"])
      .order("processed_at", { ascending: false })
      .limit(50),
  ]);

  const pendingList = (pending as Row[]) ?? [];
  const processedList = (processed as Row[]) ?? [];

  // 신청자 이름·이메일 매핑
  const userIds = Array.from(
    new Set([...pendingList, ...processedList].map((r) => r.user_id)),
  );
  const userMap = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);
    for (const p of (profiles as Array<{ id: string; name: string | null; email: string | null }>) ?? []) {
      userMap.set(p.id, { name: p.name, email: p.email });
    }
  }

  const who = (userId: string) => {
    const u = userMap.get(userId);
    return u?.name || u?.email || userId.slice(0, 8);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">캐시 충전 승인</h1>
        <p className="text-sm text-muted">
          계좌입금 신청을 확인하고 캐시를 지급합니다. 입금 계좌:{" "}
          <span className="font-medium text-foreground">{bankAccountLine()}</span>
        </p>
      </header>

      {/* 처리 대기 */}
      <section className="flex flex-col gap-3">
        <CardTitle className="text-sm">
          처리 대기 ({pendingList.length})
        </CardTitle>
        {pendingList.length === 0 ? (
          <Card className="py-8 text-center">
            <CardDescription>대기 중인 충전 신청이 없습니다.</CardDescription>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingList.map((r) => (
              <Card key={r.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {r.amount_krw.toLocaleString("ko-KR")}원 →{" "}
                      {r.credits.toLocaleString("ko-KR")} 캐시
                    </p>
                    <p className="text-sm text-foreground">
                      입금자명: <b>{r.depositor_name}</b>
                    </p>
                    <p className="text-xs text-muted">
                      신청자: {who(r.user_id)} · {formatWhen(r.created_at)}
                    </p>
                  </div>
                  <Badge tone="warning">입금 확인 중</Badge>
                </div>
                <div className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                  통장에서 <b>{r.depositor_name}</b> 님이{" "}
                  <b>{r.amount_krw.toLocaleString("ko-KR")}원</b>을 입금했는지 확인한
                  뒤 승인하세요.
                </div>
                <DepositActions id={r.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 처리 완료 */}
      {processedList.length > 0 && (
        <section className="flex flex-col gap-3">
          <CardTitle className="text-sm">최근 처리 내역</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-border bg-surface text-xs text-muted">
                <tr>
                  <th className="p-2 text-left">처리일</th>
                  <th className="p-2 text-left">신청자</th>
                  <th className="p-2 text-left">입금자명</th>
                  <th className="p-2 text-right">금액</th>
                  <th className="p-2 text-right">캐시</th>
                  <th className="p-2 text-left">결과</th>
                  <th className="p-2 text-left">처리자</th>
                </tr>
              </thead>
              <tbody>
                {processedList.map((r) => {
                  const s = DEPOSIT_STATUS[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border hover:bg-surface"
                    >
                      <td className="whitespace-nowrap p-2 text-xs text-muted">
                        {r.processed_at ? formatWhen(r.processed_at) : "—"}
                      </td>
                      <td className="p-2">{who(r.user_id)}</td>
                      <td className="p-2">{r.depositor_name}</td>
                      <td className="p-2 text-right">
                        {r.amount_krw.toLocaleString("ko-KR")}원
                      </td>
                      <td className="p-2 text-right">
                        {r.credits.toLocaleString("ko-KR")}
                      </td>
                      <td className="p-2">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {r.status === "rejected" && r.admin_note && (
                          <span className="ml-1 text-[11px] text-muted">
                            ({r.admin_note})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted">
                        {r.processed_by ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
