"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { NOTIFICATION_ENABLE_COST } from "@/lib/credits/constants";

const ENABLE_COST = NOTIFICATION_ENABLE_COST;

export function NotificationSettings() {
  // 서버에 저장된 현재 수신 여부
  const [emailOn, setEmailOn] = useState<boolean | null>(null);
  // 체크박스(저장 전 의도)
  const [checked, setChecked] = useState(false);
  // 이미 활성화 비용을 낸 적 있는지
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [charged, setCharged] = useState(0);
  const [needCredit, setNeedCredit] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications/email-pref")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          const on = d.enabled !== false;
          setEmailOn(on);
          setChecked(on);
          if (d.alreadyPaid) setAlreadyPaid(true);
        }
      })
      .catch(() => {
        setEmailOn(false);
        setChecked(false);
      });
  }, []);

  const save = async () => {
    if (emailOn === null) return;
    setNeedCredit(false);
    setErr(null);
    setCharged(0);

    // 켜기인데 아직 비용 안 냈으면 확인
    if (checked && !emailOn && !alreadyPaid) {
      const ok = window.confirm(
        `이메일 알림을 켜면 ${ENABLE_COST}캐시가 1회 차감됩니다.\n(한 번만 차감되고, 이후 끄고 켜도 추가 차감은 없어요)\n\n계속할까요?`,
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/notifications/email-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailOn(checked);
        if (data?.charged > 0) {
          setCharged(data.charged);
          setAlreadyPaid(true);
        } else if (checked) {
          setAlreadyPaid(true);
        }
      } else if (res.status === 402) {
        setNeedCredit(true);
        setChecked(false);
      } else {
        setErr(data?.error ?? "저장에 실패했습니다");
      }
    } catch {
      setErr("네트워크 오류로 저장에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const dirty = emailOn !== null && checked !== emailOn;

  return (
    <Card className="flex flex-col gap-3">
      {/* 1) 제목 + 설명 */}
      <div>
        <CardTitle className="text-sm">자동 매각 감시</CardTitle>
        <p className="mt-1 text-[11px] text-muted">
          켜두면 <b>매월 자동으로 내 차 시세를 분석</b>해, 매각 적기·시세 변동이
          생기면 이메일로 <b>먼저</b> 알려드려요. (켜지 않으면 직접 분석할 때만 확인)
        </p>
      </div>

      {/* 2) 체크 */}
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={busy || emailOn === null}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span className="flex items-center gap-1.5 text-sm text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          매월 자동 분석 + 매각 적기·시세변동 알림 받기
          {!alreadyPaid && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              최초 {ENABLE_COST.toLocaleString("ko-KR")}캐시
            </span>
          )}
        </span>
      </label>

      {/* 3) 저장하기 */}
      <button
        type="button"
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {busy
          ? "처리 중..."
          : !dirty && emailOn
            ? "알림 켜짐 ✓"
            : "저장하기"}
      </button>

      {/* 4) 저장 후 결과 문구 */}
      {charged > 0 && (
        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          ✅ 이메일 알림이 켜졌어요. {charged.toLocaleString("ko-KR")}캐시가
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
      {err && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          ⚠️ {err}
        </p>
      )}
    </Card>
  );
}
