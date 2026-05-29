import { createAdminClient } from "@/lib/supabase/server";

export type AnalysisOutcome =
  | "success"
  | "cache_hit"
  | "overload"
  | "error"
  | "insufficient_credits"
  | "validation_error";

export type LogAnalysisArgs = {
  userId: string;
  vehicleId?: string | null;
  outcome: AnalysisOutcome;
  modelUsed?: string | null;
  durationMs?: number | null;
  currentPrice?: number | null;
  signal?: string | null;
  errorMessage?: string | null;
  snapshot?: {
    manufacturer?: string;
    model?: string;
    year?: number;
  } | null;
};

/**
 * 분석 시도 로그 기록. fire-and-forget — 실패해도 메인 응답 막지 않음.
 */
export async function logAnalysis(args: LogAnalysisArgs): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("analysis_logs").insert({
      user_id: args.userId,
      vehicle_id: args.vehicleId ?? null,
      outcome: args.outcome,
      model_used: args.modelUsed ?? null,
      duration_ms: args.durationMs ?? null,
      current_price: args.currentPrice ?? null,
      signal: args.signal ?? null,
      error_message: args.errorMessage ?? null,
      snapshot_manufacturer: args.snapshot?.manufacturer ?? null,
      snapshot_model: args.snapshot?.model ?? null,
      snapshot_year: args.snapshot?.year ?? null,
    });
  } catch (e) {
    console.error("analysis_logs insert failed (ignored)", e);
  }
}

/**
 * 최근 N분 안에 에러가 threshold 건 이상이면 운영자에게 알림.
 * 중복 알림 방지: 같은 알림이 1시간 안에 있으면 스킵.
 */
export async function maybeAlertAdminOnErrorBurst(opts: {
  windowMinutes?: number;
  threshold?: number;
} = {}): Promise<void> {
  const windowMinutes = opts.windowMinutes ?? 10;
  const threshold = opts.threshold ?? 3;
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const { count: errorCount } = await admin
      .from("analysis_logs")
      .select("id", { count: "exact", head: true })
      .in("outcome", ["overload", "error"])
      .gte("created_at", since);
    if (!errorCount || errorCount < threshold) return;

    // 운영자 user_id 찾기
    const { ADMIN_EMAILS } = await import("@/lib/admin/check");
    const { data: list } = await admin.auth.admin.listUsers();
    const adminIds = (list?.users ?? [])
      .filter(
        (u: { email?: string }) =>
          u.email && ADMIN_EMAILS.has(u.email.toLowerCase()),
      )
      .map((u: { id: string }) => u.id);
    if (adminIds.length === 0) return;

    // 1시간 안에 같은 종류 알림 있으면 스킵
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .in("user_id", adminIds)
      .eq("type", "system")
      .like("title", "%분석 에러 급증%")
      .gte("created_at", recent)
      .limit(1);
    if (existing && existing.length > 0) return;

    const inserts = adminIds.map((adminId: string) => ({
      user_id: adminId,
      type: "system" as const,
      title: `⚠️ 분석 에러 급증 (${errorCount}건/${windowMinutes}분)`,
      message:
        `최근 ${windowMinutes}분 안에 시세 분석 에러가 ${errorCount}건 발생했습니다.\n` +
        `/admin/analyses 에서 상세 확인 후 Gemini API 상태를 점검해 주세요.`,
    }));
    await admin.from("notifications").insert(inserts);
  } catch (e) {
    console.error("admin error-burst alert failed (ignored)", e);
  }
}
