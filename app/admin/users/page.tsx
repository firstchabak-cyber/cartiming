import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils/format";

type UserRow = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
  created_at: string;
};

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  // listUsers 전체스캔(페이지당 50명) 대신 profiles 단일 쿼리 (가입 시 트리거로 자동생성)
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, email, name, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const users: UserRow[] = (profilesData ?? []).map(
    (p: { id: string; email: string | null; name: string | null; created_at: string }) => ({
      id: p.id,
      email: p.email,
      user_metadata: { name: p.name },
      created_at: p.created_at,
    }),
  );

  // 사용자별 캐시 잔액 + 차량 수 묶기
  const userIds = users.map((u) => u.id);
  const { data: credits } = await admin
    .from("user_credits")
    .select("user_id, balance, lifetime_member, permanent_free_slots")
    .in("user_id", userIds);
  const { data: vehicleCounts } = await admin
    .from("vehicles")
    .select("user_id, status")
    .in("user_id", userIds);

  type CreditRow = {
    user_id: string;
    balance: number;
    lifetime_member: boolean;
    permanent_free_slots: number;
  };
  const creditMap = new Map<string, CreditRow>();
  for (const c of (credits ?? []) as CreditRow[]) {
    creditMap.set(c.user_id, c);
  }
  const vehicleCountMap = new Map<string, { active: number; sold: number }>();
  for (const v of (vehicleCounts ?? []) as { user_id: string; status: string }[]) {
    const cur = vehicleCountMap.get(v.user_id) ?? { active: 0, sold: 0 };
    if (v.status === "sold") cur.sold++;
    else if (v.status === "active") cur.active++;
    vehicleCountMap.set(v.user_id, cur);
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">고객 관리</h1>
        <p className="text-sm text-muted">전체 {users.length}명</p>
      </header>

      {users.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>가입한 사용자가 없습니다.</CardDescription>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted">
              <tr>
                <th className="p-2 text-left">이메일</th>
                <th className="p-2 text-left">이름</th>
                <th className="p-2 text-right">캐시</th>
                <th className="p-2 text-right">영구 슬롯</th>
                <th className="p-2 text-right">활성 차량</th>
                <th className="p-2 text-right">매각</th>
                <th className="p-2 text-left">가입일</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const c = creditMap.get(u.id);
                const v = vehicleCountMap.get(u.id) ?? { active: 0, sold: 0 };
                const name =
                  (u.user_metadata?.name as string | undefined) ?? "—";
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-surface"
                  >
                    <td className="p-2">{u.email ?? "-"}</td>
                    <td className="p-2">{name}</td>
                    <td className="p-2 text-right font-mono">
                      {c?.lifetime_member
                        ? "평생"
                        : (c?.balance ?? 0).toLocaleString("ko-KR")}
                    </td>
                    <td className="p-2 text-right">
                      {c?.permanent_free_slots ?? 0}
                    </td>
                    <td className="p-2 text-right">{v.active}</td>
                    <td className="p-2 text-right">{v.sold}</td>
                    <td className="p-2 text-xs text-muted">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
