"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type VehicleOption = {
  id: string;
  manufacturer: string;
  model: string;
  trim: string | null;
  year: number;
  mileage: number;
  plate_number: string | null;
};

type LoanInfo = {
  principal: number;
  monthly_payment: number;
  balances: {
    now: number;
    after_1m: number;
    after_3m: number;
    after_6m: number;
    after_1y: number;
    after_2y: number;
    after_3y: number;
  };
};

type AnalysisResult = {
  vehicle_id: string;
  current_price: number;
  predicted_1m: number;
  predicted_3m: number;
  predicted_6m: number;
  predicted_1y: number;
  predicted_2y: number;
  predicted_3y: number;
  signal: "sell_now" | "review" | "hold";
  rationale: string;
  generated_at: string;
  cached?: boolean;
  loan: LoanInfo | null;
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const SIGNAL_META: Record<
  AnalysisResult["signal"],
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  sell_now: { label: "매각 적기", tone: "success" },
  review: { label: "관망", tone: "warning" },
  hold: { label: "보유 유지", tone: "neutral" },
};

export function AnalysisClient({ vehicles }: { vehicles: VehicleOption[] }) {
  const params = useSearchParams();
  const initialId = params.get("vehicleId") ?? vehicles[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  if (vehicles.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <CardTitle>등록된 차량이 없습니다</CardTitle>
        <CardDescription>
          차량을 먼저 등록하면 시세 분석을 받을 수 있어요.
        </CardDescription>
      </Card>
    );
  }

  const runAnalysis = async (force = false) => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedId, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        const base = data?.error ?? `분석에 실패했습니다 (HTTP ${res.status})`;
        const detail = data?.detail
          ? ` — ${data.detail}`
          : data?.issues
            ? ` — ${Object.entries(data.issues)
                .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
                .join(" / ")}`
            : "";
        setError(base + detail);
        return;
      }
      setResult(data as AnalysisResult);
    } catch {
      setError("네트워크 오류로 분석에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? [
        {
          name: "현재",
          price: result.current_price,
          loan: result.loan?.balances.now,
        },
        {
          name: "1개월",
          price: result.predicted_1m,
          loan: result.loan?.balances.after_1m,
        },
        {
          name: "3개월",
          price: result.predicted_3m,
          loan: result.loan?.balances.after_3m,
        },
        {
          name: "6개월",
          price: result.predicted_6m,
          loan: result.loan?.balances.after_6m,
        },
        {
          name: "1년",
          price: result.predicted_1y,
          loan: result.loan?.balances.after_1y,
        },
        {
          name: "2년",
          price: result.predicted_2y,
          loan: result.loan?.balances.after_2y,
        },
        {
          name: "3년",
          price: result.predicted_3y,
          loan: result.loan?.balances.after_3y,
        },
      ]
    : [];

  const netRow = result?.loan
    ? {
        m1: result.predicted_1m - result.loan.balances.after_1m,
        m3: result.predicted_3m - result.loan.balances.after_3m,
        m6: result.predicted_6m - result.loan.balances.after_6m,
        y1: result.predicted_1y - result.loan.balances.after_1y,
        y2: result.predicted_2y - result.loan.balances.after_2y,
        y3: result.predicted_3y - result.loan.balances.after_3y,
      }
    : null;
  const netNow = result?.loan
    ? result.current_price - result.loan.balances.now
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <CardTitle>차량 선택</CardTitle>
        <ul className="flex flex-col gap-2">
          {vehicles.map((v) => {
            const active = v.id === selectedId;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-surface",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {v.manufacturer} {v.model}
                      {v.trim ? ` ${v.trim}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {v.year}년식 · {v.mileage.toLocaleString("ko-KR")} km
                      {v.plate_number ? ` · ${v.plate_number}` : ""}
                    </p>
                  </div>
                  {active && <Badge tone="success">선택됨</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
        <Button
          onClick={() => runAnalysis(false)}
          disabled={loading || !selectedId}
          fullWidth
        >
          {loading ? "분석 중..." : "AI 시세 분석 요청"}
        </Button>
        <p className="text-xs text-muted">
          24시간 이내 분석이 있으면 캐시된 결과가 즉시 반환됩니다. 새로 분석하려면
          결과 카드의 &quot;최신 분석 요청&quot; 버튼을 눌러주세요.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      {result && (
        <>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>현재 시세</CardTitle>
              <Badge tone={SIGNAL_META[result.signal].tone}>
                {SIGNAL_META[result.signal].label}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold text-foreground">
                {formatKRW(result.current_price)}
              </p>
              <span
                className={cn(
                  "text-xs",
                  result.cached ? "text-muted" : "text-success",
                )}
              >
                {result.cached
                  ? `캐시 · ${formatRelativeTime(result.generated_at)}`
                  : "방금 분석됨"}
              </span>
            </div>
            {result.cached && (
              <button
                type="button"
                onClick={() => runAnalysis(true)}
                disabled={loading}
                className="self-start text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {loading ? "재분석 중..." : "🔄 최신 분석 요청 (Gemini 재호출)"}
              </button>
            )}
            {result.loan && (
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">현재 대출 잔액</span>
                  <span className="font-medium">
                    {formatKRW(result.loan.balances.now)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">월 납입금</span>
                  <span className="font-medium">
                    {formatKRW(result.loan.monthly_payment)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-2">
                  <span className="font-semibold">지금 매각 시 순수령액</span>
                  <span
                    className={cn(
                      "font-bold",
                      netNow != null && netNow < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatKRW(netNow ?? 0)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 text-sm text-foreground">
              {result.rationale
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter((p) => p.length > 0)
                .map((paragraph, i) => {
                  const headerMatch = paragraph.match(
                    /^\[?(시세\s*평가|대출\s*분석|매각\s*권고)\]?[\s:：-]*/,
                  );
                  if (headerMatch) {
                    const tone =
                      headerMatch[1].replace(/\s/g, "") === "대출분석"
                        ? "text-primary"
                        : headerMatch[1].replace(/\s/g, "") === "매각권고"
                          ? "text-success"
                          : "text-foreground";
                    const body = paragraph.slice(headerMatch[0].length).trim();
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <p className={`text-xs font-semibold ${tone}`}>
                          {headerMatch[1].replace(/\s/g, " ")}
                        </p>
                        <p className="text-sm text-muted whitespace-pre-line">
                          {body}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <p
                      key={i}
                      className="text-sm text-muted whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  );
                })}
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardTitle>예상 시세 추이</CardTitle>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                  <YAxis
                    stroke="currentColor"
                    fontSize={12}
                    tickFormatter={(v: number) =>
                      `${Math.round(v / 10000)}만`
                    }
                    width={50}
                  />
                  <Tooltip
                    formatter={(v) => formatKRW(Number(v))}
                    labelStyle={{ color: "#111" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="예상 시세"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot
                  />
                  {result.loan && (
                    <Line
                      type="monotone"
                      dataKey="loan"
                      name="대출 잔액"
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-1 py-1 text-left">시점</th>
                    <th className="px-1 py-1">예상 시세</th>
                    {netRow && <th className="px-1 py-1">잔액</th>}
                    {netRow && <th className="px-1 py-1">순수령액</th>}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "1개월",
                      price: result.predicted_1m,
                      net: netRow?.m1,
                      bal: result.loan?.balances.after_1m,
                    },
                    {
                      label: "3개월",
                      price: result.predicted_3m,
                      net: netRow?.m3,
                      bal: result.loan?.balances.after_3m,
                    },
                    {
                      label: "6개월",
                      price: result.predicted_6m,
                      net: netRow?.m6,
                      bal: result.loan?.balances.after_6m,
                    },
                    {
                      label: "1년",
                      price: result.predicted_1y,
                      net: netRow?.y1,
                      bal: result.loan?.balances.after_1y,
                    },
                    {
                      label: "2년",
                      price: result.predicted_2y,
                      net: netRow?.y2,
                      bal: result.loan?.balances.after_2y,
                    },
                    {
                      label: "3년",
                      price: result.predicted_3y,
                      net: netRow?.y3,
                      bal: result.loan?.balances.after_3y,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="px-1 py-1.5 text-left text-muted">
                        {row.label}
                      </td>
                      <td className="px-1 py-1.5 font-semibold">
                        {formatKRW(row.price)}
                      </td>
                      {netRow && (
                        <td className="px-1 py-1.5 text-muted">
                          {formatKRW(row.bal ?? 0)}
                        </td>
                      )}
                      {netRow && row.net != null && (
                        <td
                          className={cn(
                            "px-1 py-1.5 font-semibold",
                            row.net < 0 ? "text-danger" : "text-success",
                          )}
                        >
                          {formatKRW(row.net)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 border-warning/30 bg-warning/5">
            <p className="text-sm font-semibold text-foreground">
              ⚠️ 시세 안내
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>
                위 금액은 <strong>업자 매입가</strong> 기준입니다 (딜러가 차주로부터
                매입하는 도매 시점 가격).
              </li>
              <li>
                일반 중고차 소매 시세(엔카·KB차차차 등) 보다 통상{" "}
                <strong>10~15% 낮은 금액</strong> 으로 추정되어 있습니다.
              </li>
              <li>
                <strong>입력하신 외판 상태(판금/교환)</strong> 와{" "}
                <strong>대출 잔액</strong> 이 가격·매각 권고에 반영되어 있습니다.
                외판/대출/주행거리를 수정하면 &quot;최신 분석 요청&quot; 으로 재분석해 주세요.
              </li>
              <li>
                실제 매각 금액은{" "}
                <strong>매각 시기·매수자(개인/딜러)·차량 상태·시장 동향</strong>{" "}
                에 따라 달라질 수 있습니다.
              </li>
              <li>
                <strong>침수·도난·말소·소유권 이력</strong> 은 본 분석에 포함되지 않습니다.
                자동차365(car365.go.kr) 등 공식 채널에서 별도 확인해 주세요.
              </li>
              <li>
                AI 추정값이므로 실제 매각 전 <strong>딜러 2~3곳의 견적</strong> 을 받아
                비교하시는 것을 권장합니다.
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
