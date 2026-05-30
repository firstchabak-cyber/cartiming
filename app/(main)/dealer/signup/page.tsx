"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function DealerSignupPageInner() {
  const searchParams = useSearchParams();
  const nextParam = isSafeNext(searchParams.get("next"));
  // 신규 가입 직후엔 사업자 정보 등록 폼으로
  const next = nextParam ?? "/dealer/register";

  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-6 py-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          For Dealers
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">딜러 회원가입</h1>
        <p className="mt-2 text-sm text-muted">
          가입 후 사업자 정보를 등록하면
          <br />
          1~2일 안에 매물 입찰이 가능합니다
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
          이미 딜러 계정이 있으신가요?{" "}
          <Link href="/dealer/login" className="font-semibold text-primary">
            딜러 로그인
          </Link>
        </p>

        <Link
          href="/dealer"
          className="text-center text-xs text-muted underline"
        >
          딜러 안내 페이지로
        </Link>
      </section>

      <p className="text-center text-[11px] text-muted">
        가입 후 사업자등록증·매매사원증을 첨부하면 운영자가 확인 후 승인합니다.
      </p>
    </div>
  );
}

export default function DealerSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DealerSignupPageInner />
    </Suspense>
  );
}
