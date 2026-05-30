import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate, formatKRW, formatMileage } from "@/lib/utils/format";
import { GrantCreditsForm } from "@/components/admin/GrantCreditsForm";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();
  const { data: userRes } = await admin.auth.admin.getUserById(params.id);
  const user = userRes?.user;
  if (!user) notFound();

  const [{ data: credits }, { data: vehicles }, { data: txns }] =
    await Promise.all([
      admin
        .from("user_credits")
        .select("balance, lifetime_member, permanent_free_slots, updated_at")
        .eq("user_id", params.id)
        .maybeSingle(),
      admin
        .from("vehicles")
        .select("id, manufacturer, model, year, status, sold_at, plate_number, created_at")
        .eq("user_id", params.id)
        .order("created_at", { ascending: false }),
      admin
        .from("credit_transactions")
        .select("id, type, amount, balance_after, description, created_at")
        .eq("user_id", params.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const name = (user.user_metadata?.name as string | undefined) ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href="/admin/users" className="text-xs text-primary hover:underline">
          ← 고객 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{name}</h1>
        <p className="text-sm text-muted">{user.email}</p>
        <p className="text-xs text-muted">user_id: {user.id}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardTitle className="text-sm">캐시 잔액</CardTitle>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {credits?.lifetime_member
              ? "평생회원"
              : `${(credits?.balance ?? 0).toLocaleString("ko-KR")}`}
          </p>
        </Card>
        <Card>
          <CardTitle className="text-sm">영구 무료 슬롯</CardTitle>
          <p className="mt-1 text-2xl font-bold text-success">
            +{credits?.permanent_free_slots ?? 0}
          </p>
        </Card>
        <Card>
          <CardTitle className="text-sm">가입일</CardTitle>
          <p className="mt-1 text-base">{formatDate(user.created_at)}</p>
          <p className="text-xs text-muted">
            마지막 로그인: {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "-"}
          </p>
        </Card>
      </div>

      <GrantCreditsForm userId={user.id} />

      <Card className="flex flex-col gap-2 border-danger/30">
        <CardTitle className="text-sm text-danger">위험 구역</CardTitle>
        <CardDescription>
          이 고객 계정과 등록 차량·캐시·이력이 모두 영구 삭제됩니다.
        </CardDescription>
        <AdminDeleteButton
          endpoint={`/api/admin/users/${user.id}`}
          label="이 고객 계정 삭제"
          confirmWord="삭제"
          redirectTo="/admin/users"
        />
      </Card>

      <Card>
        <CardTitle>등록 차량 ({(vehicles ?? []).length})</CardTitle>
        {(vehicles ?? []).length === 0 ? (
          <CardDescription className="mt-2">없음</CardDescription>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {(vehicles as Array<{
              id: string;
              manufacturer: string;
              model: string;
              year: number;
              status: string;
              sold_at: string | null;
              plate_number: string | null;
              created_at: string;
            }>).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 py-2 text-xs"
              >
                <div>
                  {v.plate_number && (
                    <span className="mr-2 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                      {v.plate_number}
                    </span>
                  )}
                  <span className="text-foreground">
                    {v.manufacturer} {v.model} ({v.year})
                  </span>
                  <span className="ml-2 text-muted">
                    {v.status === "sold"
                      ? `매각 ${v.sold_at ? formatDate(v.sold_at) : ""}`
                      : "활성"}
                  </span>
                </div>
                <Link
                  href={`/admin/vehicles/${v.id}`}
                  className="text-primary hover:underline"
                >
                  →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>최근 캐시 거래 내역</CardTitle>
        {(txns ?? []).length === 0 ? (
          <CardDescription className="mt-2">없음</CardDescription>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {(txns as Array<{
              id: string;
              type: string;
              amount: number;
              balance_after: number;
              description: string | null;
              created_at: string;
            }>).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 py-2 text-xs"
              >
                <div>
                  <p className="text-foreground">{t.description ?? t.type}</p>
                  <p className="text-muted">{formatDate(t.created_at)}</p>
                </div>
                <p
                  className={`font-semibold ${
                    t.amount > 0
                      ? "text-success"
                      : t.amount < 0
                        ? "text-danger"
                        : "text-muted"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
