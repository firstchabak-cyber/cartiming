import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

type WaitlistRow = {
  id: string;
  email: string;
  source: string;
  referrer: string | null;
  created_at: string;
};

/** "06.09 14:32" 형태로 보기 좋게 */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminWaitlistPage() {
  const admin = createAdminClient();

  // 전체 신청자 수 (전체 카운트) + 최근 명단(최대 500)
  const [{ count }, { data }] = await Promise.all([
    admin.from("waitlist").select("id", { count: "exact", head: true }),
    admin
      .from("waitlist")
      .select("id, email, source, referrer, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const list = (data as WaitlistRow[]) ?? [];
  const total = count ?? 0;

  // 오늘(자정 이후) 신청자 수 — 명단에서 계산
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = list.filter(
    (r) => new Date(r.created_at) >= startOfToday,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">출시 알림 신청</h1>
        <p className="text-sm text-muted">
          랜딩페이지(/welcome)에서 출시 알림을 신청한 사람들이에요.
        </p>
      </header>

      {/* 핵심 숫자 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">총 신청자</p>
          <p className="text-2xl font-bold text-primary">
            {total.toLocaleString("ko-KR")}
          </p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">오늘 신청</p>
          <p className="text-2xl font-bold text-success">
            +{todayCount.toLocaleString("ko-KR")}
          </p>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            아직 신청자가 없습니다. /welcome 페이지를 커뮤니티·스레드에 공유하면
            여기에 신청자가 쌓입니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted">
              <tr>
                <th className="p-2 text-left">신청일시</th>
                <th className="p-2 text-left">이메일</th>
                <th className="p-2 text-left">유입 경로</th>
                <th className="p-2 text-left">유입 출처</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-surface"
                >
                  <td className="whitespace-nowrap p-2 text-xs text-muted">
                    {formatWhen(r.created_at)}
                  </td>
                  <td className="p-2 font-medium">{r.email}</td>
                  <td className="p-2">
                    <Badge tone="neutral">{r.source}</Badge>
                  </td>
                  <td
                    className="max-w-[220px] truncate p-2 text-xs text-muted"
                    title={r.referrer ?? undefined}
                  >
                    {r.referrer ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > list.length && (
            <p className="mt-3 text-center text-xs text-muted">
              최근 {list.length}명만 표시됩니다 (총 {total.toLocaleString("ko-KR")}명).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
