import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = createAdminClient();

  // 병렬 카운트
  const [users, vehicles, salesPending, dealersPending, transactions] =
    await Promise.all([
      admin.from("user_credits").select("user_id", { count: "exact", head: true }),
      admin
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      admin
        .from("sale_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "bidding"]),
      admin
        .from("dealers")
        .select("user_id", { count: "exact", head: true })
        .eq("verified", false),
      admin
        .from("sale_transactions")
        .select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    {
      label: "전체 사용자",
      value: users.count ?? 0,
      href: "/admin/users",
      tone: "text-primary",
    },
    {
      label: "활성 차량",
      value: vehicles.count ?? 0,
      href: "/admin/users",
      tone: "text-foreground",
    },
    {
      label: "진행 중 매각 신청",
      value: salesPending.count ?? 0,
      href: "/admin/sales",
      tone: "text-warning",
    },
    {
      label: "딜러 승인 대기",
      value: dealersPending.count ?? 0,
      href: "/admin/dealers",
      tone: "text-danger",
    },
    {
      label: "누적 실거래",
      value: transactions.count ?? 0,
      href: "/admin/transactions",
      tone: "text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="text-sm text-muted">전체 현황 한눈에 보기</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="flex flex-col gap-1 transition-colors hover:bg-surface">
              <p className="text-xs text-muted">{s.label}</p>
              <p className={`text-2xl font-bold ${s.tone}`}>
                {s.value.toLocaleString("ko-KR")}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <CardTitle>빠른 작업</CardTitle>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <Link
                href="/admin/sales"
                className="block rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                📋 매각 신청 처리 ({salesPending.count ?? 0}건)
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dealers"
                className="block rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                🏪 딜러 승인 ({dealersPending.count ?? 0}건)
              </Link>
            </li>
            <li>
              <Link
                href="/admin/users"
                className="block rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                👤 사용자 관리·캐시 지급
              </Link>
            </li>
            <li>
              <Link
                href="/admin/transactions"
                className="block rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                💾 실거래 데이터 보기
              </Link>
            </li>
          </ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <CardTitle>안내</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            <li>매각 신청이 들어오면 가입 딜러에게 카톡으로 매물 정보 전달</li>
            <li>딜러 등록 시 사업자등록증 진위 확인 후 승인</li>
            <li>매각 완료 시 자동으로 실거래 DB 누적 → AI 분석 정확도 ↑</li>
            <li>고객에게 캐시 수동 지급 가능 (마케팅·보상 등)</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
