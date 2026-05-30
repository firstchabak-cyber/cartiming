"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const TARGETS = [
  { value: "all", label: "전체 사용자", hint: "고객 + 딜러 모두" },
  { value: "dealers", label: "딜러만", hint: "등록된 딜러 전체" },
  { value: "customers", label: "고객만", hint: "딜러 제외 일반 사용자" },
] as const;

type Target = (typeof TARGETS)[number]["value"];

export function AnnouncementForm() {
  const [target, setTarget] = useState<Target>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      setError("제목과 내용을 입력해주세요");
      return;
    }
    const targetLabel = TARGETS.find((t) => t.value === target)?.label ?? "";
    if (
      !confirm(
        `"${targetLabel}" 대상으로 공지를 발송할까요?${
          email ? " (이메일 동의자에게 이메일도 발송)" : ""
        }`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          title: title.trim(),
          message: message.trim(),
          email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "발송 실패");
        return;
      }
      setResult(
        `✅ 인앱 알림 ${data.sent}명 발송 완료${
          email ? ` · 이메일 ${data.emails}명` : ""
        }`,
      );
      setTitle("");
      setMessage("");
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>공지 작성</CardTitle>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">발송 대상</label>
        <div className="grid grid-cols-3 gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTarget(t.value)}
              className={
                target === t.value
                  ? "flex flex-col items-center gap-0.5 rounded-lg border-2 border-primary bg-primary/5 px-2 py-2 text-center"
                  : "flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background px-2 py-2 text-center hover:bg-surface"
              }
            >
              <span className="text-sm font-semibold text-foreground">
                {t.label}
              </span>
              <span className="text-[10px] text-muted">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예) 추석 연휴 고객센터 운영 안내"
        maxLength={100}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">내용</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="공지 내용을 입력하세요. 줄바꿈도 그대로 전달됩니다."
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={email}
          onChange={(e) => setEmail(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        이메일도 발송 (이메일 알림에 동의한 사용자에게만)
      </label>

      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}
      {result && (
        <p className="rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success">
          {result}
        </p>
      )}

      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "발송 중..." : "공지 발송"}
      </Button>
      <p className="text-[11px] text-muted">
        ※ 인앱 알림은 대상 전원에게, 이메일은 수신 동의(이메일 알림 ON)한
        사용자에게만 발송됩니다. 발송 후 취소할 수 없으니 내용을 확인해 주세요.
      </p>
    </Card>
  );
}
