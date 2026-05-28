"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { APP_NAME } from "@/lib/constants/app";

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default function SignupPage() {
  const searchParams = useSearchParams();
  const next = isSafeNext(searchParams.get("next"));
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <Container className="flex min-h-screen flex-col justify-center gap-8 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="mt-3 text-base text-muted">
          1분이면 충분합니다. 지금 바로 시작하세요.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <SocialLoginButtons next={next} />

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <EmailLoginForm mode="signup" next={next} />

        <p className="text-center text-sm text-muted">
          이미 계정이 있으신가요?{" "}
          <Link href={loginHref} className="font-semibold text-primary">
            로그인
          </Link>
        </p>
      </section>
    </Container>
  );
}
