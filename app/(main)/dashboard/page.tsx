import Link from "next/link";
import {
  Plus,
  TrendingUp,
  Bell,
  Car,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatMileage } from "@/lib/utils/format";
import { APP_URL } from "@/lib/constants/app";
import { ReferralCard } from "@/components/profile/ReferralCard";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greetingName =
    user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "고객";

  // 차량 목록과 딜러 여부는 서로 무관하므로 동시에 조회 (순차 대기 제거로 로딩 단축)
  const [{ data: vehicles }, { data: dealer }] = user
    ? await Promise.all([
        supabase
          .from("vehicles")
          .select("id, manufacturer, model, trim, year, mileage, plate_number")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(3),
        // 딜러로 등록된 사용자에게는 딜러 센터 바로가기를 노출 (하단 네비에는 딜러 진입점이 없으므로)
        supabase
          .from("dealers")
          .select("verified")
          .eq("user_id", user.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const hasVehicles = (vehicles?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <InstallPrompt />

      <section>
        <p className="text-sm text-muted">안녕하세요</p>
        <h1 className="text-2xl font-bold text-foreground">
          {greetingName}님 👋
        </h1>
      </section>

      {hasVehicles ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">내 차량</h2>
            <Link href="/garage" className="text-xs text-muted">
              전체 보기
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {vehicles!.map((v) => (
              <li key={v.id}>
                <Link href={`/vehicles/${v.id}`}>
                  <Card className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-primary" />
                      <div>
                        {v.plate_number && (
                          <span className="mb-0.5 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                            {v.plate_number}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-foreground">
                          {v.manufacturer} {v.model}
                          {v.trim ? ` · ${v.trim}` : ""}
                        </p>
                        <p className="text-xs text-muted">
                          {v.year}년식 · {formatMileage(v.mileage)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Card className="flex flex-col items-center gap-3 bg-primary py-8 text-white">
          <p className="text-sm opacity-90">아직 등록된 차량이 없어요</p>
          <p className="text-lg font-semibold">내 차를 등록하고 시작하세요</p>
          <Link href="/vehicles/new" className="mt-2">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
            >
              <Plus className="h-5 w-5" />차량 등록하기
            </Button>
          </Link>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link href="/analysis">
          <Card className="flex h-full flex-col gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">시세 분석</CardTitle>
            <CardDescription>현재가 + 1/3/6개월 예상</CardDescription>
          </Card>
        </Link>
        <Link href="/notifications">
          <Card className="flex h-full flex-col gap-2 transition-colors hover:bg-surface">
            <Bell className="h-5 w-5 text-warning" />
            <CardTitle className="text-sm">매각 알림</CardTitle>
            <CardDescription>적정 시점 알림 · 켜기 →</CardDescription>
          </Card>
        </Link>
      </section>

      <Link href="/reviews">
        <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-surface">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm">시세 분석 후기</CardTitle>
              <CardDescription>
                다른 회원들의 실제 후기 보기 · 내 후기 쓰고 200캐시 받기
              </CardDescription>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Card>
      </Link>

      {dealer && (
        <Link href="/dealer/listings">
          <Card className="flex items-center justify-between gap-3 border-primary/30 bg-primary/5">
            <div>
              <CardTitle className="text-sm">🏷 딜러 센터</CardTitle>
              <CardDescription>
                {dealer.verified
                  ? "매물 입찰 · 내 입찰/수수료 관리"
                  : "인증 대기 중 · 매물 조회 가능"}
              </CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Card>
        </Link>
      )}

      {user && <ReferralCard link={`${APP_URL}/r/${user.id}`} />}
    </div>
  );
}
