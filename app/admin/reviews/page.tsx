import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { formatKRW } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Row = {
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
  status: "pending" | "approved" | "rejected" | "hidden";
  rewarded: boolean;
  created_at: string;
};

const SIGNAL_LABEL: Record<Row["signal"], string> = {
  sell_now: "매각 적기",
  review: "관망",
  hold: "보유 유지",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function carLine(r: Row): string {
  return `${r.manufacturer} ${r.model}${r.trim ? " · " + r.trim : ""} · ${r.year}년식 · ${r.mileage.toLocaleString("ko-KR")}km`;
}

export default async function AdminReviewsPage() {
  const admin = createAdminClient();

  const [{ data: pending }, { data: approved }] = await Promise.all([
    admin
      .from("analysis_reviews")
      .select(
        "id, nickname, manufacturer, model, trim, year, mileage, current_price, signal, review_text, status, rewarded, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("analysis_reviews")
      .select(
        "id, nickname, manufacturer, model, trim, year, mileage, current_price, signal, review_text, status, rewarded, created_at",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const pendingList = (pending as Row[]) ?? [];
  const approvedList = (approved as Row[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">시세 후기 관리</h1>
        <p className="text-sm text-muted">
          개인정보(차량번호 등)·부적절한 내용이 없는지 확인하고 공개하세요. 승인 시
          차량 1대당 200캐시가 1회 지급됩니다.
        </p>
      </header>

      {/* 승인 대기 */}
      <section className="flex flex-col gap-3">
        <CardTitle className="text-sm">승인 대기 ({pendingList.length})</CardTitle>
        {pendingList.length === 0 ? (
          <Card className="py-8 text-center">
            <CardDescription>대기 중인 후기가 없습니다.</CardDescription>
          </Card>
        ) : (
          pendingList.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {carLine(r)}
                  </p>
                  <p className="text-xs text-muted">
                    업자 매입가 {formatKRW(r.current_price)} ·{" "}
                    {SIGNAL_LABEL[r.signal]} · {r.nickname} ·{" "}
                    {formatWhen(r.created_at)}
                    {r.rewarded && " · 보상지급됨"}
                  </p>
                </div>
                <Badge tone="warning">대기</Badge>
              </div>
              <p className="whitespace-pre-line rounded-lg bg-surface p-3 text-sm text-foreground">
                {r.review_text}
              </p>
              <ReviewActions id={r.id} status="pending" />
            </Card>
          ))
        )}
      </section>

      {/* 공개 중 */}
      {approvedList.length > 0 && (
        <section className="flex flex-col gap-3">
          <CardTitle className="text-sm">
            공개 중 ({approvedList.length})
          </CardTitle>
          {approvedList.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {carLine(r)}
                  </p>
                  <p className="text-xs text-muted">
                    {r.nickname} · {formatWhen(r.created_at)}
                  </p>
                </div>
                <Badge tone="success">공개</Badge>
              </div>
              <p className="whitespace-pre-line rounded-lg bg-surface p-3 text-sm text-foreground">
                {r.review_text}
              </p>
              <ReviewActions id={r.id} status="approved" />
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
