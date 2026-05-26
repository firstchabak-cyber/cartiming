"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

export default function LoginPage() {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <Container className="flex min-h-screen flex-col justify-center gap-8 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="mt-3 whitespace-pre-line text-base text-muted">
          내 차의 매각 적기를{"\n"}알려드립니다
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <SocialLoginButtons />

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {showEmail ? (
          <EmailLoginForm mode="login" />
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
          <Link href="/signup" className="font-semibold text-primary">
            회원가입
          </Link>
        </p>
      </section>

      <p className="mt-auto text-center text-xs text-muted">{APP_TAGLINE}</p>
    </Container>
  );
}
