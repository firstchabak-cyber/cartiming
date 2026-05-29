"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatKRW } from "@/lib/utils/format";

type Quote = {
  id: string;
  source: string;
  source_label: string | null;
  quoted_price: number;
  quoted_at: string;
  notes: string | null;
};

const SOURCE_OPTIONS = [
  { value: "heydealer", label: "헤이딜러" },
  { value: "kcar", label: "케이카" },
  { value: "cazza", label: "카자" },
  { value: "encar", label: "엔카" },
  { value: "kb_chacha", label: "KB차차차" },
  { value: "other", label: "기타" },
] as const;

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((o) => [o.value, o.label]),
);

const formatPriceInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("ko-KR");
};

export function ExternalQuotesPanel({
  vehicleId,
  onChange,
}: {
  vehicleId: string;
  onChange?: () => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<string>("heydealer");
  const [priceText, setPriceText] = useState("");
  const [quotedAt, setQuotedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/external-quotes`);
      const data = await res.json();
      if (res.ok) setQuotes(data.quotes ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const submit = async () => {
    const price = parseInt(priceText.replace(/[^\d]/g, ""), 10);
    if (!price || price <= 0) {
      setError("가격을 정확히 입력해 주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/external-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          quotedPrice: price,
          quotedAt,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `등록 실패 (HTTP ${res.status})`);
        return;
      }
      setPriceText("");
      setNotes("");
      setAdding(false);
      await load();
      onChange?.();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const total = quotes.length;
  const avg =
    total > 0
      ? Math.round(quotes.reduce((s, q) => s + q.quoted_price, 0) / total)
      : 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardTitle>📥 내가 받은 외부 견적</CardTitle>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + 견적 추가
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted">
        헤이딜러·케이카·엔카 등에서 받은 실제 견적을 입력하면 다음 시세 분석에
        반영됩니다.
      </p>

      {total > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
          <span className="text-muted">{total}건 평균</span>
          <span className="text-base font-bold text-foreground">
            {formatKRW(avg)}
          </span>
        </div>
      )}

      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted">출처</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted">받은 날짜</span>
              <input
                type="date"
                value={quotedAt}
                onChange={(e) => setQuotedAt(e.target.value)}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
          </div>
          <Input
            label="견적 금액 (원)"
            inputMode="numeric"
            placeholder="예: 29,820,000"
            value={priceText}
            onChange={(e) => setPriceText(formatPriceInput(e.target.value))}
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted">메모 (선택)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="rounded-md border border-border bg-background p-2 text-sm"
              placeholder="실차 검사 후 받은 금액 / 입찰 최고가 등"
            />
          </label>
          {error && (
            <p className="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">
              ⚠️ {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              disabled={busy}
            >
              취소
            </Button>
            <Button type="button" fullWidth onClick={submit} disabled={busy}>
              {busy ? "등록 중..." : "등록"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted">불러오는 중...</p>
      ) : total === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
          아직 등록된 견적이 없습니다.
          <br />
          헤이딜러 등에서 받은 견적을 추가하면 분석 정확도가 올라가요.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  {SOURCE_LABEL[q.source] ?? q.source}
                </span>
                <span className="text-[11px] text-muted">{q.quoted_at}</span>
                {q.notes && (
                  <span className="text-[11px] text-muted">{q.notes}</span>
                )}
              </div>
              <span className="text-base font-bold text-foreground">
                {formatKRW(q.quoted_price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
