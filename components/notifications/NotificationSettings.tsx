"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { PushSubscribeButton } from "./PushSubscribeButton";

export function NotificationSettings() {
  const [emailOn, setEmailOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/email-pref")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setEmailOn(d.enabled !== false);
      })
      .catch(() => setEmailOn(true));
  }, []);

  const toggleEmail = async () => {
    if (emailOn === null) return;
    const next = !emailOn;
    setEmailOn(next);
    setBusy(true);
    try {
      await fetch("/api/notifications/email-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      setEmailOn(!next); // 롤백
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-sm">알림 설정</CardTitle>

      <div className="flex flex-col gap-1">
        <PushSubscribeButton />
        <p className="text-[11px] text-muted">
          📱 휴대폰 홈 화면에 앱을 추가하면 알림이 더 안정적으로 도착해요.
          (아이폰은 홈 화면 추가 후에만 푸시가 작동합니다)
        </p>
      </div>

      <label className="flex items-center justify-between border-t border-border pt-3">
        <div>
          <p className="text-sm font-medium text-foreground">이메일 알림</p>
          <p className="text-[11px] text-muted">
            중요 알림을 가입 이메일로도 받아요
          </p>
        </div>
        <input
          type="checkbox"
          checked={emailOn ?? true}
          onChange={toggleEmail}
          disabled={busy || emailOn === null}
          className="h-5 w-9 cursor-pointer accent-primary"
        />
      </label>
    </Card>
  );
}
