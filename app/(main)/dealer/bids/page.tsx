import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatKRW, formatMileage } from "@/lib/utils/format";

const BID_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  offered: { label: "진행 중", tone: "warning" },
  selected: { label: "🎉 선정됨", tone: "success" },
  rejected: { label: "미선정", tone: "neutral" },
  expired: { label: "마감됨", tone: "neutral" },
};

export default async function DealerBidsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dealer } = await supabase
    .from("dealers")
    .select("verified, business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!dealer) redirect("/dealer/register");

  // 내가 한 모든 입찰
  const { data: bids } = await supabase
    .from("sale_bids")
    .select(
      "id, sale_request_id, bid_amount, notes, status, created_at, sale:sale_requests(status, vehicle:vehicles(manufacturer, model, year, mileage, plate_number))",
    )
    .eq("dealer_id", user.id)
    .order("created_at", { ascending: false });

  type BidRow = {
    id: string;
    sale_request_id: string;
    bid_amount: number;
    notes: string | null;
    status: string;
    created_at: string;
    sale: {
      status: string;
      vehicle: {
        manufacturer: string;
        model: string;
        year: number;
        mileage: number;
        plate_number: string | null;
      } | null;
    } | null;
  };
  const list = (bids as unknown as BidRow[]) ?? [];

  const selected = list.filter((b) => b.status === "selected");
  const offered = list.filter((b) => b.status === "offered");
  const rejected = list.filter(
    (b) => b.status === "rejected" || b.status === "expired",
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 입찰 내역</h1>
        <Link href="/dealer/listings" className="text-xs text-primary underline">
          매물 리스트 →
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="선정" count={selected.length} tone="success" />
        <StatCard label="진행 중" count={offered.length} tone="warning" />
        <StatCard label="미선정" count={rejected.length} tone="neutral" />
      </div>

      {selected.length > 0 && (
        <Section title="🎉 선정된 매물" bids={selected} />
      )}
      {offered.length > 0 && (
        <Section title="입찰 진행 중" bids={offered} />
      )}
      {rejected.length > 0 && (
        <Section title="미선정 / 마감" bids={rejected} muted />
      )}

      {list.length === 0 && (
        <Card className="py-10 text-center">
          <CardDescription>아직 입찰 내역이 없습니다.</CardDescription>
          <Link
            href="/dealer/listings"
            className="mt-2 inline-block text-xs text-primary underline"
          >
            매물 리스트에서 입찰을 시작해보세요
          </Link>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "success" | "warning" | "neutral";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-muted";
  return (
    <Card className="flex flex-col items-center gap-1 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
    </Card>
  );
}

function Section({
  title,
  bids,
  muted,
}: {
  title: string;
  bids: Array<{
    id: string;
    sale_request_id: string;
    bid_amount: number;
    notes: string | null;
    status: string;
    created_at: string;
    sale: {
      status: string;
      vehicle: {
        manufacturer: string;
        model: string;
        year: number;
        mileage: number;
        plate_number: string | null;
      } | null;
    } | null;
  }>;
  muted?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        {bids.map((b) => {
          const v = b.sale?.vehicle;
          const meta = BID_STATUS[b.status] ?? BID_STATUS.offered;
          return (
            <li key={b.id}>
              <Link href={`/dealer/listings/${b.sale_request_id}`}>
                <Card
                  className={`flex items-center justify-between gap-3 transition-colors hover:bg-surface ${
                    muted ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    {v?.plate_number && (
                      <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {v.plate_number}
                      </span>
                    )}
                    <CardTitle className="text-sm">
                      {v?.manufacturer} {v?.model} ({v?.year}년식)
                    </CardTitle>
                    <CardDescription>
                      {v ? formatMileage(v.mileage) : ""} · 입찰{" "}
                      {formatDate(b.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <p className="text-base font-bold">
                      {formatKRW(b.bid_amount)}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
