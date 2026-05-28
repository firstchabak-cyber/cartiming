"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginPageInner() {
  const [showEmail, setShowEmail] = useState(false);
  const searchParams = useSearchParams();
  const next = isSafeNext(searchParams.get("next"));
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <Container className="flex min-h-screen flex-col justify-center gap-8 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="mt-3 whitespace-pre-line text-base text-muted">
          내 차의 매각 적기를{"\n"}알려드립니다
        </p>
        {next && (
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
            로그인 후 원래 보시던 페이지로 이동합니다.
          </p>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <SocialLoginButtons next={next} />

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {showEmail ? (
          <EmailLoginForm mode="login" next={next} />
        ) : (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="h-11 w-full rounded-xl border border-border text-sm font-medium text-muted hover:bg-surface"
          >
            이메일로 시작하기
          </button>
        )}

        <p className="text-center text-sm text-muted">
          처음이신가요?{" "}
          <Link href={signupHref} className="font-semibold text-primary">
            회원가입
          </Link>
        </p>
      </section>

      <p className="mt-auto text-center text-xs text-muted">{APP_TAGLINE}</p>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginPageInner />
    </Suspense>
  );
}
