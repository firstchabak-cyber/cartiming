"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function WaitlistBroadcast({ total }: { total: number }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (payload: {
    subject: string;
    body: string;
    testEmail?: string;
  }) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/waitlist/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "발송에 실패했습니다");
        return;
      }
      if (data.test) {
        setMsg(
          data.sent
            ? `테스트 메일을 ${payload.testEmail} 로 보냈어요. 메일함을 확인해보세요.`
            : "테스트 발송에 실패했어요. SMTP 설정을 확인해주세요.",
        );
      } else {
        setMsg(
          `전체 발송 완료 — 성공 ${data.sent}건${
            data.failed ? `, 실패 ${data.failed}건` : ""
          } (총 ${data.total}명)`,
        );
      }
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  };

  const onTest = () => {
    if (!subject.trim() || !body.trim()) {
      setError("제목과 내용을 먼저 입력해주세요");
      return;
    }
    if (!testEmail.trim()) {
      setError("테스트로 받을 이메일을 입력해주세요");
      return;
    }
    send({ subject: subject.trim(), body: body.trim(), testEmail: testEmail.trim() });
  };

  const onSendAll = () => {
    if (!subject.trim() || !body.trim()) {
      setError("제목과 내용을 먼저 입력해주세요");
      return;
    }
    const ok = window.confirm(
      `신청자 ${total}명 전원에게 이 메일을 발송할까요?\n\n제목: ${subject.trim()}\n\n발송 후에는 취소할 수 없어요.`,
    );
    if (!ok) return;
    send({ subject: subject.trim(), body: body.trim() });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle className="text-sm">📣 신청자 전체에게 메일 보내기</CardTitle>
        <p className="text-xs text-muted">
          출시 소식 등을 모아둔 신청자 {total.toLocaleString("ko-KR")}명에게 한 번에
          발송해요. 전체 발송 전 꼭 ‘테스트 발송’으로 먼저 확인하세요.
        </p>
      </div>

      <Input
        label="제목"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={150}
        placeholder="예: 카타임이 정식 출시됐어요 🚗"
      />

      <div className="flex w-full flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">내용</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="신청해주셔서 감사합니다. 드디어 카타임이 정식 출시됐어요! 지금 바로 내 차의 매각 적기를 확인해보세요."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-[11px] text-muted">
          줄바꿈은 그대로 메일에 반영돼요. 맨 아래 ‘카타임 바로가기’ 버튼은 자동으로
          붙습니다.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <Input
          label="테스트 발송 (내 이메일로 먼저 받아보기)"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="내 이메일 주소"
          type="email"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={busy}
        >
          {busy ? "보내는 중…" : "테스트 1통 보내기"}
        </Button>
      </div>

      {msg && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <Button type="button" size="lg" onClick={onSendAll} disabled={busy}>
        {busy ? "발송 중…" : `신청자 ${total.toLocaleString("ko-KR")}명 전체에게 발송`}
      </Button>
    </Card>
  );
}
