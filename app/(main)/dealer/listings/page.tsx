import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate, formatMileage } from "@/lib/utils/format";

export default async function DealerListingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dealer/listings");

  const { data: dealer } = await supabase
    .from("dealers")
    .select("verified, business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!dealer) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">매물 리스트</h1>
        <Card>
          <CardDescription>
            딜러 등록이 필요합니다.{" "}
            <Link href="/dealer/register" className="text-primary underline">
              등록하기
            </Link>
          </CardDescription>
        </Card>
      </div>
    );
  }

  // 입찰 진행 중인 매물만 (관리자 승인 통과된 것)
  const { data: listings } = await supabase
    .from("sale_requests")
    .select(
      "id, status, current_mileage, sale_timing, additional_notes, bidding_closes_at, created_at, vehicle:vehicles(manufacturer, model, trim, year, mileage, fuel_type, body_type, plate_number)",
    )
    .eq("status", "bidding")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">매물 리스트</h1>
        <div className="flex gap-3 text-xs">
          <Link href="/dealer/bids" className="text-primary underline">
            내 입찰 내역
          </Link>
          <Link href="/dealer/fees" className="text-primary underline">
            내 수수료
          </Link>
          <Link href="/dealer/register" className="text-primary underline">
            내 딜러 정보
          </Link>
        </div>
      </header>

      {!dealer.verified && (
        <Card className="border-warning/30 bg-warning/5">
          <CardDescription>
            ⏳ 딜러 인증 대기 중 — 매물 조회는 가능하지만 입찰은 승인 후 가능합니다.
          </CardDescription>
        </Card>
      )}

      {(listings ?? []).length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>현재 입찰 가능한 매물이 없습니다.</CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {listings!.map((l) => {
            const v = l.vehicle as unknown as {
              manufacturer: string;
              model: string;
              trim: string | null;
              year: number;
              mileage: number;
              fuel_type: string | null;
              body_type: string | null;
              plate_number: string | null;
            } | null;
            return (
              <li key={l.id}>
                <Link href={`/dealer/listings/${l.id}`}>
                  <Card className="flex flex-col gap-1">
                    {v?.plate_number && (
                      <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {v.plate_number}
                      </span>
                    )}
                    <CardTitle>
                      {v?.manufacturer} {v?.model}
                      {v?.trim ? ` · ${v.trim}` : ""}
                    </CardTitle>
                    <CardDescription>
                      {v?.year}년식 ·{" "}
                      {formatMileage(l.current_mileage ?? v?.mileage ?? 0)}
                      {v?.fuel_type ? ` · ${v.fuel_type}` : ""}
                    </CardDescription>
                    <p className="text-xs text-muted">
                      신청일 {formatDate(l.created_at)}
                      {l.bidding_closes_at &&
                        ` · 입찰 마감 ${formatDate(l.bidding_closes_at)}`}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
