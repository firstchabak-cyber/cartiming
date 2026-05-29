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

/** 프로미스가 ms 안에 안 끝나면 거부 (무한 대기 방지) */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 시간 초과`)), ms),
    ),
  ]);
}

type Status = "loading" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [charged, setCharged] = useState(0);
  const [needCredit, setNeedCredit] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

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

    let settled = false;
    const finish = (s: Status, sub: boolean) => {
      if (settled) return;
      settled = true;
      setStatus(s);
      setChecked(sub);
    };
    const timeout = setTimeout(() => finish("unsubscribed", false), 5000);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        clearTimeout(timeout);
        finish(sub ? "subscribed" : "unsubscribed", !!sub);
      })
      .catch(() => {
        clearTimeout(timeout);
        finish("unsubscribed", false);
      });

    fetch("/api/push/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.alreadyPaid) setAlreadyPaid(true);
      })
      .catch(() => {});

    return () => clearTimeout(timeout);
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setNeedCredit(false);
    setErrMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "unsubscribed");
        setChecked(false);
        if (perm === "denied") {
          setErrMsg(
            "알림 권한이 거부됐어요. 기기 설정 → 카타이밍 → 알림을 허용해 주세요.",
          );
        }
        return;
      }

      const reg = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        "서비스워커 준비",
      );

      // 기존 구독이 있으면(예전 키 등) 먼저 해지 후 새로 구독 — 키 충돌 방지
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        try {
          await existing.unsubscribe();
        } catch {
          // 무시
        }
      }

      const key = urlBase64ToUint8Array(VAPID_PUBLIC!);
      const sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer as ArrayBuffer,
        }),
        15000,
        "푸시 구독",
      );

      const json = sub.toJSON();
      const res = await withTimeout(
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        }),
        15000,
        "서버 저장",
      );
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("subscribed");
        setChecked(true);
        setAlreadyPaid(true);
        if (data?.charged > 0) setCharged(data.charged);
      } else if (res.status === 402) {
        try {
          await sub.unsubscribe();
        } catch {
          // 무시
        }
        setNeedCredit(true);
        setStatus("unsubscribed");
        setChecked(false);
      } else {
        setErrMsg(data?.error ?? `알림 설정 실패 (코드 ${res.status})`);
        setChecked(false);
      }
    } catch (e) {
      setChecked(false);
      setErrMsg(
        (e instanceof Error ? e.message : "알 수 없는 오류") +
          " — 잠시 후 다시 시도하거나, 홈 화면에 추가한 앱에서 켜보세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      const reg = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        "서비스워커 준비",
      );
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
      setChecked(false);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "해제 실패");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setCharged(0);
    if (checked && status !== "subscribed") {
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

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted">
        알림 설정을 불러오는 중...
      </div>
    );
  }
  if (status === "unsupported") {
    return (
      <p className="rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-muted">
        이 브라우저에서는 휴대폰 푸시 알림을 지원하지 않아요. 휴대폰
        크롬(안드로이드)이나 홈 화면에 추가한 앱(아이폰)에서 켤 수 있어요. (이메일
        알림은 아래에서 받을 수 있어요)
      </p>
    );
  }
  if (status === "denied") {
    return (
      <p className="text-xs text-muted">
        브라우저에서 알림이 차단돼 있어요. 기기 설정에서 카타이밍 알림을 허용해
        주세요.
      </p>
    );
  }

  const subscribed = status === "subscribed";
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
        {busy ? "처리 중..." : !dirty && subscribed ? "알림 켜짐 ✓" : "저장하기"}
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
      {errMsg && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          ⚠️ {errMsg}
        </p>
      )}
    </div>
  );
}
