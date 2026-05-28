import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealerRegisterForm } from "@/components/dealer/DealerRegisterForm";
import { Card } from "@/components/ui/Card";

export default async function DealerRegisterPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("dealers")
    .select(
      "business_name, business_reg_number, contact_phone, location, verified, verified_at, rating_avg, rating_count",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // 본인이 받은 후기 (verified 와 무관하게 조회)
  const { data: myReviews } = await supabase
    .from("dealer_reviews")
    .select("id, rating, comment, anonymous, created_at")
    .eq("dealer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (existing?.verified) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">딜러 정보</h1>
        <Card className="flex flex-col gap-2 border-success/30 bg-success/5">
          <p className="text-sm font-semibold text-success">✅ 인증된 딜러</p>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">상호</dt>
            <dd className="text-right">{existing.business_name}</dd>
            <dt className="text-muted">사업자번호</dt>
            <dd className="text-right">{existing.business_reg_number}</dd>
            <dt className="text-muted">연락처</dt>
            <dd className="text-right">{existing.contact_phone}</dd>
            {existing.location && (
              <>
                <dt className="text-muted">위치</dt>
                <dd className="text-right">{existing.location}</dd>
              </>
            )}
            {existing.rating_count > 0 && (
              <>
                <dt className="text-muted">평점</dt>
                <dd className="text-right text-warning">
                  ★ {existing.rating_avg} ({existing.rating_count}건)
                </dd>
              </>
            )}
          </dl>
        </Card>

        {(myReviews?.length ?? 0) > 0 && (
          <Card className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              내가 받은 후기 ({myReviews!.length}건)
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {(myReviews as Array<{
                id: string;
                rating: number;
                comment: string | null;
                anonymous: boolean;
                created_at: string;
              }>).map((r) => (
                <li key={r.id} className="flex flex-col gap-1 py-2">
                  <p className="text-warning text-sm">
                    {"★".repeat(r.rating)}
                    <span className="text-muted">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  {r.comment && (
                    <p className="text-xs text-foreground">"{r.comment}"</p>
                  )}
                  <p className="text-[11px] text-muted">
                    {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    {r.anonymous && " · 익명"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <a
          href="/dealer/listings"
          className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white"
        >
          매물 리스트 보기 →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">딜러 등록</h1>
      {existing && !existing.verified && (
        <Card className="flex flex-col gap-1 border-warning/30 bg-warning/5">
          <p className="text-sm font-semibold text-warning">⏳ 인증 대기 중</p>
          <p className="text-xs text-muted">
            운영자 검수 중입니다. 영업일 1~2일 안에 승인되면 입찰 가능해집니다.
          </p>
        </Card>
      )}
      <DealerRegisterForm initial={existing ?? null} />
    </div>
  );
}
