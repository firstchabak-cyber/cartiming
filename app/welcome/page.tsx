import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { BusinessFooter } from "@/components/layout/BusinessFooter";
import { APP_NAME, APP_URL } from "@/lib/constants/app";

// 커뮤니티/스레드에 공유했을 때 보기 좋게 (검증 캠페인용 랜딩)
export const metadata: Metadata = {
  title: `${APP_NAME} — 내 차, 언제 팔아야 가장 이득일까?`,
  description:
    "AI가 시세 흐름을 분석해 '지금 팔지, 더 기다릴지'를 알려드려요. 매각 적기가 오면 알림까지.",
  openGraph: {
    title: `${APP_NAME} — 내 차, 언제 팔아야 가장 이득일까?`,
    description:
      "AI가 시세 흐름을 분석해 매각 적기를 알려주는 서비스. 출시 알림을 받아보세요.",
    url: `${APP_URL}/welcome`,
    type: "website",
  },
};

const BENEFITS = [
  {
    icon: "📉",
    title: "내 차값은 매달 떨어져요",
    body: "그런데 떨어지는 속도는 차마다, 시기마다 달라요. 1~2개월 차이로 수십만 원이 갈립니다.",
  },
  {
    icon: "🤖",
    title: "AI가 시세 흐름을 읽어줘요",
    body: "지금 시세와 앞으로의 흐름을 분석해 '지금 팔지 / 더 기다릴지'를 신호로 알려드려요.",
  },
  {
    icon: "🔔",
    title: "매각 적기가 오면 알림",
    body: "매일 시세를 들여다볼 필요 없어요. 팔기 좋은 타이밍이 오면 카타임이 먼저 알려드립니다.",
  },
];

export default function WelcomeLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Container className="flex flex-1 flex-col gap-12 py-14">
        {/* 히어로 */}
        <header className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt={APP_NAME}
            width={72}
            height={72}
            className="rounded-2xl shadow-card"
          />
          <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
          <h1 className="text-3xl font-bold leading-snug text-foreground sm:text-4xl">
            내 차, 언제 팔아야
            <br />
            가장 이득일까?
          </h1>
          <p className="max-w-sm text-base text-foreground/80">
            AI가 시세 흐름을 분석해 <b>지금 팔지, 더 기다릴지</b>를 알려드려요.
            매각 적기가 오면 알림까지.
          </p>
        </header>

        {/* 왜 카타임 */}
        <section className="flex flex-col gap-4">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <span className="text-2xl" aria-hidden>
                {b.icon}
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">{b.title}</p>
                <p className="text-sm text-muted">{b.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* 주 행동: 진짜 앱 체험 */}
        <section className="flex flex-col gap-3">
          <Link href="/signup">
            <Button fullWidth size="lg">
              지금 내 차 무료로 분석해보기
            </Button>
          </Link>
          <p className="text-center text-xs text-muted">
            1분 가입 · 차량 등록은 그 다음 · 가입 시 분석 캐시 지급
          </p>
        </section>

        {/* 보조 행동: 아직 망설이면 이메일 */}
        <section className="flex flex-col gap-3 border-t border-border pt-8">
          <p className="text-center text-sm font-medium text-foreground">
            아직 망설여진다면, 출시 소식만 먼저 받아보세요
          </p>
          <WaitlistForm source="welcome" />
          <p className="text-center text-xs text-muted">
            스팸 없이, 매각 타이밍·출시 소식만 보내드려요. 언제든 수신 거부할 수
            있어요.
          </p>
        </section>
      </Container>
      <BusinessFooter />
    </div>
  );
}
