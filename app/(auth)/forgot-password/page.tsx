"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants/app";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMsg(null);
    const supabase = createClient();
    // 메일의 링크를 누르면 기존 인증 콜백을 거쳐 비밀번호 재설정 화면으로 이동한다
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });
    if (error) {
      setErrorMsg("메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    // 가입 여부와 무관하게 동일한 안내를 보여준다 (이메일 존재 여부 노출 방지)
    setSent(true);
  });

  return (
    <Container className="flex min-h-screen flex-col justify-center gap-8 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-primary">비밀번호 찾기</h1>
        <p className="mt-3 text-base text-muted">
          가입하신 이메일로 재설정 링크를 보내드립니다.
        </p>
      </header>

      {sent ? (
        <section className="flex flex-col gap-4 text-center">
          <div className="rounded-xl bg-success/10 px-4 py-5 text-sm text-success">
            재설정 메일을 보냈습니다.{"\n"}메일함(스팸함도)을 확인해주세요.
          </div>
          <p className="text-xs text-muted">
            메일이 오지 않으면, {APP_NAME}에 가입된 이메일이 아닐 수 있어요.
            네이버·구글로 가입하셨다면 비밀번호가 없으니 해당 버튼으로
            로그인해주세요.
          </p>
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            로그인 화면으로 돌아가기
          </Link>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
          <Input
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            {isSubmitting ? "메일 보내는 중…" : "재설정 메일 받기"}
          </Button>
          <Link
            href="/login"
            className="mt-1 text-center text-sm text-muted hover:text-foreground"
          >
            로그인 화면으로 돌아가기
          </Link>
        </form>
      )}
    </Container>
  );
}
