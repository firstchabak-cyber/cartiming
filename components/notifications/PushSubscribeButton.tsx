"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const ENABLE_COST = 500;

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
  // 체크박스 상태 (저장 전 사용자가 켠/끈 의도)
  const [checked, setChecked] = useState(false);
  const [charged, setCharged] = useState(0);
  const [needCredit, setNeedCredit] = useState(false);
  // 이미 한 번 알림 비용을 낸 적이 있는지 (재활성화 시 무료 안내용)
  const [alreadyPaid, setAlreadyPaid] = useState(false);

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
      .then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
        setChecked(!!sub);
      })
      .catch(() => {
        setStatus("unsubscribed");
        setChecked(false);
      });
    // 이미 알림 비용 낸 적 있는지 확인 (재활성화는 무료)
    fetch("/api/push/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.alreadyPaid) setAlreadyPaid(true);
      })
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setNeedCredit(false);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "unsubscribed");
        setChecked(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(VAPID_PUBLIC!);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("subscribed");
        setChecked(true);
        if (data?.charged > 0) {
          setCharged(data.charged);
          setAlreadyPaid(true);
        } else {
          setAlreadyPaid(true);
        }
      } else if (res.status === 402) {
        try {
          await sub.unsubscribe();
        } catch {
          // 무시
        }
        setNeedCredit(true);
        setStatus("unsubscribed");
        setChecked(false);
      }
    } catch {
      setChecked(false);
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
      setChecked(false);
    } catch {
      // 무시
    } finally {
      setBusy(false);
    }
  };

  // 저장하기: 체크 상태에 맞춰 구독/해지 적용
  const save = async () => {
    setCharged(0);
    if (checked && status !== "subscribed") {
      // 켜기 — 최초면 500 차감 확인
      if (!alreadyPaid) {
        const ok = window.confirm(
          `매각 알림을 켜면 ${ENABLE_COST}캐시가 1회 차감됩니다.\n(한 번만 차감되고, 이후 끄고 켜도 추가 차감은 없어요)\n\n계속할까요?`,
        );
        if (!ok) return;
      }
      await subscribe();
    } else if (!checked && status === "subscribed") {
      await unsubscribe();
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

  const subscribed = status === "subscribed";
  // 저장 버튼은 체크 상태와 실제 구독 상태가 다를 때만 활성
  const dirty = checked !== subscribed;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={busy}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span className="flex items-center gap-1.5 text-sm text-foreground">
          <Bell className="h-4 w-4 text-warning" />
          매각 적기·시세 변동 휴대폰 알림 받기
          {!alreadyPaid && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              최초 {ENABLE_COST}캐시
            </span>
          )}
        </span>
      </label>

      <button
        type="button"
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {busy
          ? "처리 중..."
          : !dirty
            ? subscribed
              ? "알림 켜짐 ✓"
              : "저장하기"
            : "저장하기"}
      </button>

      {charged > 0 && (
        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          ✅ 알림이 켜졌어요. {charged.toLocaleString("ko-KR")}캐시가
          차감되었습니다. (이후 추가 차감 없음)
        </p>
      )}
      {needCredit && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          캐시가 부족해요. 알림을 켜려면 {ENABLE_COST}캐시가 필요합니다.{" "}
          <a href="/credits/charge" className="font-semibold underline">
            충전하기 →
          </a>
        </p>
      )}
    </div>
  );
}
