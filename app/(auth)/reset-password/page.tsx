"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // 메일 링크를 통해 들어온 정상적인 재설정 세션인지 확인
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(data.session ? "ok" : "invalid");
    });
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      setErrorMsg("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1500);
  });

  return (
    <Container className="flex min-h-screen flex-col justify-center gap-8 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-primary">새 비밀번호 설정</h1>
        <p className="mt-3 text-base text-muted">
          새로 사용할 비밀번호를 입력해주세요.
        </p>
      </header>

      {ready === "checking" ? (
        <p className="text-center text-sm text-muted">확인 중…</p>
      ) : ready === "invalid" ? (
        <section className="flex flex-col gap-4 text-center">
          <div className="rounded-xl bg-danger/10 px-4 py-5 text-sm text-danger">
            링크가 만료되었거나 올바르지 않습니다.{"\n"}
            비밀번호 찾기를 다시 시도해주세요.
          </div>
          <Link
            href="/forgot-password"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            비밀번호 찾기로 이동
          </Link>
        </section>
      ) : done ? (
        <div className="rounded-xl bg-success/10 px-4 py-5 text-center text-sm text-success">
          비밀번호가 변경되었습니다.{"\n"}잠시 후 이동합니다…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
          <Input
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            placeholder="6자 이상"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            placeholder="한 번 더 입력"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            {isSubmitting ? "변경 중…" : "비밀번호 변경하기"}
          </Button>
        </form>
      )}
    </Container>
  );
}
