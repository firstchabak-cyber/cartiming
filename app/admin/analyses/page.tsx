import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatKRW } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  outcome: string;
  model_used: string | null;
  duration_ms: number | null;
  current_price: number | null;
  signal: string | null;
  error_message: string | null;
  snapshot_manufacturer: string | null;
  snapshot_model: string | null;
  snapshot_year: number | null;
  created_at: string;
};

const OUTCOME_LABEL: Record<string, string> = {
  success: "✅ 성공",
  cache_hit: "💾 캐시",
  overload: "⏳ 과부하 (503)",
  error: "❌ 에러",
  insufficient_credits: "💰 캐시 부족",
  validation_error: "⚠️ 응답 형식 오류",
};

const OUTCOME_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral" | "primary"
> = {
  success: "success",
  cache_hit: "primary",
  overload: "warning",
  error: "danger",
  insufficient_credits: "neutral",
  validation_error: "warning",
};

export default async function AdminAnalysesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const admin = createAdminClient();
  const filter = searchParams.filter ?? "all";

  let query = admin
    .from("analysis_logs")
    .select(
      "id, user_id, vehicle_id, outcome, model_used, duration_ms, current_price, signal, error_message, snapshot_manufacturer, snapshot_model, snapshot_year, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "errors") {
    query = query.in("outcome", ["overload", "error", "validation_error"]);
  } else if (filter && filter !== "all") {
    query = query.eq("outcome", filter);
  }

  const { data: logs } = await query;
  const list = (logs ?? []) as LogRow[];

  // 통계 (최근 24시간)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("analysis_logs")
    .select("outcome")
    .gte("created_at", since24h);
  const recentArr = (recent ?? []) as Array<{ outcome: string }>;
  const stats = {
    total: recentArr.length,
    success: recentArr.filter((r) => r.outcome === "success").length,
    cache: recentArr.filter((r) => r.outcome === "cache_hit").length,
    overload: recentArr.filter((r) => r.outcome === "overload").length,
    error: recentArr.filter((r) => r.outcome === "error").length,
    validation: recentArr.filter((r) => r.outcome === "validation_error").length,
    insufficient: recentArr.filter((r) => r.outcome === "insufficient_credits")
      .length,
  };
  const errorRate =
    stats.total > 0
      ? Math.round(
          ((stats.overload + stats.error + stats.validation) / stats.total) *
            100,
        )
      : 0;

  // 차주 정보 묶기
  const userIds = Array.from(new Set(list.map((l) => l.user_id)));
  const userMap = new Map<string, { email: string; name: string }>();
  if (userIds.length > 0) {
    const { data: authList } = await admin.auth.admin.listUsers();
    for (const u of authList?.users ?? []) {
      if (userIds.includes(u.id)) {
        userMap.set(u.id, {
          email: u.email ?? "—",
          name: (u.user_metadata?.name as string | undefined) ?? "—",
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">시세 분석 모니터링</h1>
        <p className="text-sm text-muted">
          모든 사용자의 분석 시도·성공·실패 기록 (최근 200건)
        </p>
      </header>

      {/* 24시간 통계 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">24h 총 시도</p>
          <p className="text-xl font-bold text-foreground">{stats.total}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">성공률</p>
          <p
            className={`text-xl font-bold ${
              errorRate > 30
                ? "text-danger"
                : errorRate > 10
                  ? "text-warning"
                  : "text-success"
            }`}
          >
            {100 - errorRate}%
          </p>
          <p className="text-[10px] text-muted">에러율 {errorRate}%</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">캐시 활용</p>
          <p className="text-xl font-bold text-primary">{stats.cache}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">에러</p>
          <p className="text-xl font-bold text-danger">
            {stats.overload + stats.error + stats.validation}건
          </p>
          <p className="text-[10px] text-muted">
            503 {stats.overload} · 기타 {stats.error + stats.validation}
          </p>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { v: "all", label: "전체" },
          { v: "errors", label: "에러만" },
          { v: "success", label: "성공" },
          { v: "cache_hit", label: "캐시" },
          { v: "overload", label: "503" },
          { v: "insufficient_credits", label: "캐시 부족" },
        ].map((f) => (
          <Link
            key={f.v}
            href={`/admin/analyses?filter=${f.v}`}
            className={`rounded-full px-3 py-1 ${
              filter === f.v
                ? "bg-primary text-white"
                : "bg-surface text-muted hover:bg-border"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* 로그 리스트 */}
      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>해당 조건의 기록이 없습니다.</CardDescription>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="flex flex-col divide-y divide-border">
            {list.map((l) => {
              const u = userMap.get(l.user_id);
              const tone = OUTCOME_TONE[l.outcome] ?? "neutral";
              return (
                <li
                  key={l.id}
                  className={`flex flex-col gap-1 p-3 text-sm ${
                    l.outcome === "error" || l.outcome === "overload"
                      ? "bg-danger/5"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>
                        {OUTCOME_LABEL[l.outcome] ?? l.outcome}
                      </Badge>
                      {l.duration_ms !== null && (
                        <span className="text-[11px] text-muted">
                          {l.duration_ms} ms
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted">
                      {formatDate(l.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    {l.snapshot_manufacturer && (
                      <span className="text-foreground">
                        {l.snapshot_manufacturer} {l.snapshot_model} (
                        {l.snapshot_year})
                      </span>
                    )}
                    {u && (
                      <Link
                        href={`/admin/users/${l.user_id}`}
                        className="text-primary hover:underline"
                      >
                        {u.name} · {u.email}
                      </Link>
                    )}
                    {l.current_price !== null && (
                      <span className="font-semibold text-foreground">
                        {formatKRW(l.current_price)}
                      </span>
                    )}
                    {l.signal && (
                      <span className="text-muted">신호 {l.signal}</span>
                    )}
                  </div>
                  {l.error_message && (
                    <p className="rounded-md bg-danger/10 px-2 py-1 font-mono text-[10px] text-danger">
                      {l.error_message}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="text-[11px] text-muted">
        ※ 같은 종류 에러가 10분 안에 3건 이상 발생하면 운영자 알림이 자동 발송됩니다.
      </p>
    </div>
  );
}
