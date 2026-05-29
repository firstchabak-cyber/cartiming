import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  type WantedRow,
  conditionSummary,
  deadlineInfo,
} from "@/lib/wanted/format";

export const dynamic = "force-dynamic";

export default async function WantedBoardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wanted");

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: rows } = await admin
    .from("dealer_wanted")
    .select("*")
    .eq("status", "approved")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (rows as WantedRow[]) ?? [];
  const now = Date.now();

  // 내 차량과 매칭되는지 표시용 — 내 차 제조사+모델 집합
  const { data: myVehicles } = await supabase
    .from("vehicles")
    .select("manufacturer, model, year, mileage")
    .eq("user_id", user.id);
  const mine = (myVehicles ?? []) as Array<{
    manufacturer: string;
    model: string;
    year: number;
    mileage: number;
  }>;

  const isMatch = (w: WantedRow) =>
    mine.some(
      (v) =>
        v.manufacturer === w.manufacturer &&
        v.model === w.model &&
        (w.year_min == null || v.year >= w.year_min) &&
        (w.year_max == null || v.year <= w.year_max) &&
        (w.max_mileage == null || v.mileage <= w.max_mileage),
    );

  return (
    <div className="flex flex-col gap-4 py-2">
      <header>
        <h1 className="text-xl font-bold text-foreground">딜러가 찾는 차</h1>
        <p className="text-xs text-muted">
          딜러가 직접 구하는 차량 목록입니다. 내 차가 해당되면 매각을 신청해
          견적을 받아보세요.
        </p>
      </header>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            현재 딜러가 찾는 차량이 없습니다. 새 요청이 등록되면 여기에
            표시됩니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((w) => {
            const dl = deadlineInfo(w.expires_at, now);
            const matched = isMatch(w);
            return (
              <Card
                key={w.id}
                className={`flex flex-col gap-2 ${matched ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {w.manufacturer} {w.model}
                  </CardTitle>
                  <Badge
                    tone={
                      dl.tone === "urgent"
                        ? "danger"
                        : dl.tone === "expired"
                          ? "neutral"
                          : "primary"
                    }
                  >
                    {dl.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted">{conditionSummary(w)}</p>
                {w.memo && <p className="text-xs text-foreground">💬 {w.memo}</p>}
                <p className="text-[11px] text-muted">{w.dealer_name} 딜러</p>
                {matched && (
                  <div className="mt-1 flex flex-col gap-1 rounded-lg bg-primary/10 p-2">
                    <p className="text-xs font-semibold text-primary">
                      ✅ 내 차가 이 조건에 맞아요!
                    </p>
                    <Link
                      href="/vehicles"
                      className="rounded-md bg-primary px-3 py-1.5 text-center text-xs font-semibold text-white"
                    >
                      내 차 매각 신청하기
                    </Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
