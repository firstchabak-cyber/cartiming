import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/constants/app";

export default function LandingPage() {
  return (
    <Container className="flex min-h-screen flex-col justify-between py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold text-primary">CarTiming</p>
        <h1 className="text-4xl font-bold leading-tight text-foreground">
          {APP_NAME}
        </h1>
        <p className="text-lg font-medium text-foreground/80">
          {APP_TAGLINE}
        </p>
        <p className="mt-2 max-w-xs text-sm text-muted">{APP_DESCRIPTION}</p>
      </header>

      <section className="flex flex-col gap-3">
        <Link href="/login">
          <Button fullWidth size="lg">
            시작하기
          </Button>
        </Link>
        <p className="text-center text-xs text-muted">
          1분 가입 · 차량 등록은 그 다음
        </p>
      </section>
    </Container>
  );
}
