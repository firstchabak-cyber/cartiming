"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

type FormValues = z.infer<typeof schema>;

type EmailLoginFormProps = {
  mode: "login" | "signup";
  next?: string | null;
};

export function EmailLoginForm({ mode, next }: EmailLoginFormProps) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const destination = next ?? "/dashboard";

  const onSubmit = handleSubmit(async (values) => {
    setErrorMsg(null);
    setInfoMsg(null);
    const supabase = createClient();

    if (mode === "signup") {
      const callback = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: callback,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      if (data.session) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setInfoMsg("인증 메일을 보냈습니다. 메일함을 확인해주세요.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setErrorMsg("로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.");
      return;
    }
    router.replace(destination);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <Input
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="비밀번호"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder="6자 이상"
        error={errors.password?.message}
        {...register("password")}
      />
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      {infoMsg && <p className="text-sm text-success">{infoMsg}</p>}
      <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
        {isSubmitting
          ? mode === "login"
            ? "로그인 중…"
            : "가입 중…"
          : mode === "login"
            ? "로그인"
            : "이메일로 가입하기"}
      </Button>
    </form>
  );
}
