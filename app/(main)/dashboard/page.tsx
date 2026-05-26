import Link from "next/link";
import { Plus, TrendingUp, Bell, Car, ChevronRight } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatMileage } from "@/lib/utils/format";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greetingName =
    user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "고객";

  const { data: vehicles } = user
    ? await supabase
        .from("vehicles")
        .select("id, manufacturer, model, trim, year, mileage")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: null };

  const hasVehicles = (vehicles?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
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
                        <p className="text-sm font-semibold text-foreground">
                          {v.manufacturer} {v.model}
                          {v.trim ? ` ${v.trim}` : ""}
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
        <Card className="flex flex-col gap-2">
          <Bell className="h-5 w-5 text-warning" />
          <CardTitle className="text-sm">매각 알림</CardTitle>
          <CardDescription>적정 시점이 오면 알려드려요</CardDescription>
        </Card>
      </section>
    </div>
  );
}
