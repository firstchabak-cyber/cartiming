"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "loading" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [charged, setCharged] = useState(0);
  const [needCredit, setNeedCredit] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID_PUBLIC
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(VAPID_PUBLIC!);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // 일부 TS lib 버전에서 Uint8Array 직접 전달 시 타입 불일치 → BufferSource 로 캐스팅
        applicationServerKey: key.buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("subscribed");
        setNeedCredit(false);
        if (data?.charged > 0) setCharged(data.charged);
      } else if (res.status === 402) {
        // 잔액 부족 → 구독 취소하고 충전 안내
        try {
          await sub.unsubscribe();
        } catch {
          // 무시
        }
        setNeedCredit(true);
        setStatus("unsubscribed");
      }
    } catch {
      // 무시
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      // 무시
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return null;
  if (status === "unsupported") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-muted">
        브라우저에서 알림이 차단돼 있어요. 기기 설정에서 카타이밍 알림을 허용해
        주세요.
      </p>
    );
  }

  const on = status === "subscribed";
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={on ? unsubscribe : subscribe}
        disabled={busy}
        className={
          on
            ? "flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-50"
            : "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        }
      >
        {on ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {busy ? "처리 중..." : on ? "휴대폰 알림 끄기" : "휴대폰 푸시 알림 켜기 (500캐시)"}
      </button>
      {charged > 0 && (
        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          알림 활성화로 {charged.toLocaleString("ko-KR")} 캐시가 차감되었어요.
          이후엔 추가 차감 없이 알림을 받습니다.
        </p>
      )}
      {needCredit && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          캐시가 부족해요. 알림을 켜려면 500캐시가 필요합니다.{" "}
          <a href="/credits/charge" className="font-semibold underline">
            충전하기 →
          </a>
        </p>
      )}
    </div>
  );
}
