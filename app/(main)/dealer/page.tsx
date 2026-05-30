import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function DealerLandingPage() {
  // 이미 로그인 + 딜러 등록된 사용자는 바로 매물 리스트로
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (dealer) redirect("/dealer/listings");
    redirect("/dealer/register");
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* 헤더 */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          For Dealers
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          카타이밍 딜러로
          <br />
          합류하세요
        </h1>
        <p className="mt-3 text-sm text-muted">
          검증된 차주의 매각 신청에 입찰하고
          <br />
          빠르게 매입하세요
        </p>
      </header>

      {/* CTA 버튼 */}
      <div className="flex flex-col gap-2">
        <Link
          href="/dealer/signup"
          className="block rounded-xl bg-primary py-3.5 text-center text-base font-semibold text-white"
        >
          딜러 회원가입
        </Link>
        <Link
          href="/dealer/login"
          className="block rounded-xl border border-border bg-background py-3.5 text-center text-base font-semibold text-foreground"
        >
          이미 딜러 계정이 있어요
        </Link>
      </div>

      {/* 혜택 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">왜 카타이밍 딜러인가요?</h2>

        <Card className="flex flex-col gap-1">
          <CardTitle>💰 업계 최저 수수료 1.5%</CardTitle>
          <p className="text-xs text-muted">
            매각가의 1.5% (1,000만원 미만은 15만원 고정). 헤이딜러 등 경쟁사
            대비 약 절반 수준.
          </p>
        </Card>

        <Card className="flex flex-col gap-1">
          <CardTitle>🚗 검증된 차주</CardTitle>
          <p className="text-xs text-muted">
            운영자가 모든 매각 신청을 사전 검수. 사진·차량등록증·주행거리 모두
            확인됩니다.
          </p>
        </Card>

        <Card className="flex flex-col gap-1">
          <CardTitle>⚡ 빠른 정산</CardTitle>
          <p className="text-xs text-muted">
            거래 완료 후 차주에게 알림 자동 발송. 수수료는 거래 후 청구되며
            계좌이체 1건으로 정산 완료.
          </p>
        </Card>

        <Card className="flex flex-col gap-1">
          <CardTitle>⭐ 후기로 쌓는 신뢰</CardTitle>
          <p className="text-xs text-muted">
            거래 후 차주가 별점·후기 작성. 평점 높은 딜러일수록 선정 확률
            상승.
          </p>
        </Card>
      </section>

      {/* 진행 흐름 */}
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">진행 흐름</h2>
        <ol className="flex flex-col gap-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-foreground">1.</span> 회원가입 →
            사업자정보 등록
          </li>
          <li>
            <span className="font-semibold text-foreground">2.</span> 운영자
            인증 (영업일 1~2일)
          </li>
          <li>
            <span className="font-semibold text-foreground">3.</span> 매물
            리스트에서 입찰
          </li>
          <li>
            <span className="font-semibold text-foreground">4.</span> 선정 시
            차주 연락처 자동 공개
          </li>
          <li>
            <span className="font-semibold text-foreground">5.</span> 실사 후
            매입가 조정 → 거래 완료
          </li>
        </ol>
      </section>

      {/* 안내 */}
      <p className="text-center text-[11px] text-muted">
        사업자등록증 + 매매사원증을 보유한 중고차 매매사원 대상입니다.
      </p>
    </div>
  );
}
