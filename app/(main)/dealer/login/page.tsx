"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default function DealerLoginPage() {
  const [showEmail, setShowEmail] = useState(false);
  const searchParams = useSearchParams();
  // 딜러 로그인 후 기본 목적지는 /dealer (등록 여부에 따라 자동 라우팅됨)
  const nextParam = isSafeNext(searchParams.get("next"));
  const next = nextParam ?? "/dealer";

  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-6 py-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          For Dealers
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">딜러 로그인</h1>
        <p className="mt-2 text-sm text-muted">
          카타이밍 딜러 페이지에 로그인하세요
        </p>
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
          딜러 계정이 없으신가요?{" "}
          <Link href="/dealer/signup" className="font-semibold text-primary">
            딜러 회원가입
          </Link>
        </p>

        <Link
          href="/dealer"
          className="text-center text-xs text-muted underline"
        >
          딜러 안내 페이지로
        </Link>
      </section>
    </div>
  );
}
