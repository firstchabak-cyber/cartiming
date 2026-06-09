"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type WaitlistFormProps = {
  /** 어느 랜딩/캠페인에서 수집한 이메일인지 구분 태그 */
  source?: string;
};

export function WaitlistForm({ source = "welcome" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "잠시 후 다시 시도해주세요");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해주세요");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-center">
        <p className="text-sm font-semibold text-success">
          🚗 신청 완료! 매각 적기가 오면 가장 먼저 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="이메일 주소"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
        required
        aria-label="이메일 주소"
      />
      <Button
        type="submit"
        variant="outline"
        fullWidth
        size="lg"
        disabled={status === "loading"}
      >
        {status === "loading" ? "신청 중…" : "출시·매각 타이밍 알림 받기"}
      </Button>
    </form>
  );
}
