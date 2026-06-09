import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/utils/format";
import { WriteReviewLauncher } from "@/components/reviews/WriteReviewLauncher";

export const dynamic = "force-dynamic";

type ReviewRow = {
  id: string;
  nickname: string;
  manufacturer: string;
  model: string;
  trim: string | null;
  year: number;
  mileage: number;
  current_price: number;
  signal: "sell_now" | "review" | "hold";
  review_text: string;
  created_at: string;
};

const SIGNAL_META: Record<
  ReviewRow["signal"],
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  sell_now: { label: "매각 적기", tone: "success" },
  review: { label: "관망", tone: "warning" },
  hold: { label: "보유 유지", tone: "neutral" },
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("analysis_reviews")
    .select(
      "id, nickname, manufacturer, model, trim, year, mileage, current_price, signal, review_text, created_at",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  const list = (data as ReviewRow[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">시세 분석 후기</h1>
        <p className="text-sm text-muted">
          카타임으로 내 차 시세를 분석한 회원들의 실제 후기예요.
        </p>
      </header>

      <WriteReviewLauncher />

      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <CardDescription>
            아직 등록된 후기가 없어요. 내 차 시세를 분석하고 첫 후기를 남겨보세요!
            (차량 1대당 200캐시 지급)
          </CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => {
            const s = SIGNAL_META[r.signal];
            return (
              <Card key={r.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r.manufacturer} {r.model}
                      {r.trim ? ` · ${r.trim}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {r.year}년식 · {r.mileage.toLocaleString("ko-KR")}km · 업자
                      매입가 {formatKRW(r.current_price)}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <p className="whitespace-pre-line text-sm text-foreground">
                  {r.review_text}
                </p>
                <p className="text-[11px] text-muted">
                  {r.nickname} · {formatDay(r.created_at)}
                </p>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
