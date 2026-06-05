"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { History, Share2 } from "lucide-react";
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
import { notifyCreditsChanged } from "@/lib/credits/events";
import { CREDIT_COSTS, FREE_ANALYSIS_PER_MONTH } from "@/lib/credits/constants";
import { ExternalQuotesPanel } from "./ExternalQuotesPanel";

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

type SimilarSale = {
  channel: "cartiming" | "external";
  sold_price: number;
  sold_at: string;
  snapshot_year: number;
  snapshot_mileage: number;
  snapshot_damage_count: number;
  snapshot_plate_category?: "private" | "rental" | "commercial" | null;
};

type AnalysisResult = {
  vehicle_id: string;
  current_price: number;
  current_price_min?: number | null;
  current_price_max?: number | null;
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
  similar_sales?: SimilarSale[];
};

const PLATE_LABEL: Record<string, string> = {
  private: "자가용",
  rental: "렌터카",
  commercial: "영업용",
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
    if (loading) return; // 이미 분석 중이면 추가 클릭 무시 (중복 차감 방어)
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
      // 유료 분석(캐시 차감)이었으면 상단 캐시 뱃지 즉시 갱신
      if (!(data as AnalysisResult).cached) {
        notifyCreditsChanged();
      }
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
                    {v.plate_number && (
                      <span className="mb-0.5 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        {v.plate_number}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {v.manufacturer} {v.model}
                      {v.trim ? ` · ${v.trim}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {v.year}년식 · {v.mileage.toLocaleString("ko-KR")} km
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
        <Button
          onClick={() => runAnalysis(true)}
          disabled={loading || !selectedId}
          variant="outline"
          fullWidth
        >
          {loading ? "분석 중..." : "🔄 최신 시세로 다시 분석"}
        </Button>
        <p className="text-xs text-muted">
          24시간 이내 분석은 저장된 결과를 무료로 즉시 보여드려요. 시세는 매일
          바뀌니, 최신 시세가 궁금하면 &quot;다시 분석&quot;을 눌러주세요. (매월{" "}
          {FREE_ANALYSIS_PER_MONTH}회 무료, 이후 1회당{" "}
          {CREDIT_COSTS.analysisOverage} 캐시)
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      {selectedId && (
        <ExternalQuotesPanel vehicleId={selectedId} />
      )}

      {result && (
        <>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>현재 시세</CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone={SIGNAL_META[result.signal].tone}>
                  {SIGNAL_META[result.signal].label}
                </Badge>
                <ShareButton
                  vehicle={vehicles.find((v) => v.id === selectedId) ?? null}
                  result={result}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
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
              {result.current_price_min &&
                result.current_price_max &&
                result.current_price_min !== result.current_price_max && (
                  <p className="text-xs text-muted">
                    예상 범위{" "}
                    <span className="font-medium text-foreground">
                      {formatKRW(result.current_price_min)} ~{" "}
                      {formatKRW(result.current_price_max)}
                    </span>
                    {"  "}
                    <span className="text-[10px]">
                      (보수적 ~ 적극 매입가)
                    </span>
                  </p>
                )}
            </div>
            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={loading}
              className="self-start text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              {loading
                ? "재분석 중..."
                : result.cached
                  ? "🔄 최신 분석 요청 (Gemini 재호출)"
                  : "🔄 다시 분석 (Gemini 재호출)"}
            </button>
            <Link
              href={`/vehicles/${selectedId}`}
              className="flex items-center gap-1 self-start text-xs font-medium text-muted hover:text-foreground hover:underline"
            >
              <History className="h-3.5 w-3.5" />
              이 차량 시세 분석 기록 전체 보기
            </Link>
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

          {result.similar_sales && result.similar_sales.length > 0 && (
            <Card className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                📊 비슷한 차량 실거래 매각 ({result.similar_sales.length}건)
              </p>
              <p className="text-[11px] text-muted">
                동일 모델 ±2년식, 최근 18개월 매각 데이터
              </p>
              <ul className="flex flex-col divide-y divide-border">
                {result.similar_sales.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="text-foreground">
                        {s.sold_at} · {s.snapshot_year}년식 ·{" "}
                        {s.snapshot_mileage.toLocaleString("ko-KR")} km
                        {s.snapshot_damage_count > 0
                          ? ` · 손상${s.snapshot_damage_count}곳`
                          : " · 무사고"}
                      </span>
                      <span className="text-[10px] text-muted">
                        {s.channel === "cartiming" ? "🏷 카타임" : "📍 외부"}
                        {s.snapshot_plate_category && (
                          <span className="ml-1 rounded bg-surface px-1 py-0.5">
                            {PLATE_LABEL[s.snapshot_plate_category] ?? ""}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatKRW(s.sold_price)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

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

function ShareButton({
  vehicle,
  result,
}: {
  vehicle: VehicleOption | null;
  result: AnalysisResult;
}) {
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const buildText = () => {
    const name =
      vehicle?.plate_number
        ? `[${vehicle.plate_number}] ${vehicle.manufacturer} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`
        : vehicle
          ? `${vehicle.manufacturer} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`
          : "내 차량";
    const signalLabel = SIGNAL_META[result.signal].label;
    const headlineByTone: Record<AnalysisResult["signal"], string> = {
      sell_now: "📢 지금이 매각 적기래요!",
      review: "🔍 매각 시점 다시 봐야겠어요",
      hold: "🤝 당분간 보유 권장이래요",
    };
    const lines = [
      headlineByTone[result.signal],
      "",
      `🚗 ${name}`,
      `💰 업자 매입가 ${formatKRW(result.current_price)} · 매각 권고: ${signalLabel}`,
      `📅 1개월 ${formatKRW(result.predicted_1m)} → 3개월 ${formatKRW(result.predicted_3m)} → 6개월 ${formatKRW(result.predicted_6m)} → 1년 ${formatKRW(result.predicted_1y)}`,
    ];
    if (result.loan) {
      const net = result.current_price - result.loan.balances.now;
      lines.push(
        `🏦 대출 잔액 ${formatKRW(result.loan.balances.now)} · 매각 시 순수령액 ${formatKRW(net)}`,
      );
    }
    if (result.rationale && result.rationale.trim().length > 0) {
      lines.push("");
      lines.push("📝 분석 내용");
      lines.push(result.rationale.trim());
    }
    lines.push("");
    lines.push("─────────────────");
    lines.push("🤖 내 차 시세, AI 가 분석해주는 카타임");
    lines.push("✅ 차량번호·등록증 사진만 있으면 1분 분석");
    lines.push("✅ 헤이딜러 견적 수준의 업자 매입가 추정");
    lines.push("✅ 매각 적기 자동 알림 (무료)");
    lines.push("");
    lines.push("👉 무료 시작: https://cartiming.app");
    return lines.join("\n");
  };

  const text = buildText();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 권한 거부 등 — textarea 자동 선택으로 폴백
      const ta = document.getElementById(
        "share-text-area",
      ) as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.select();
      }
    }
  };

  const handleClick = async () => {
    // 모바일: 네이티브 공유 시트 우선
    const canShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      // 모바일 디바이스로 추정 (PC 의 일부 브라우저는 share 가 있어도 잘 작동 안 함)
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (canShare) {
      try {
        await navigator.share({
          title: "cartiming 시세 분석",
          text,
        });
        return;
      } catch {
        // 취소 시 모달로 폴백하지 않고 종료
        return;
      }
    }
    // PC / 미지원: 모달로 열기 (자동으로 복사도 시도)
    setModalOpen(true);
    void copyToClipboard();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface"
        aria-label="공유"
      >
        <Share2 className="h-3.5 w-3.5" />
        공유
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-hidden rounded-2xl bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">
                시세 분석 공유
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full px-2 text-lg text-muted hover:text-foreground"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-muted">
              ✅ 텍스트가 클립보드에 자동 복사되었어요. 카톡·메시지에 그대로
              붙여넣기 (Ctrl+V) 하세요.
            </p>

            <textarea
              id="share-text-area"
              readOnly
              value={text}
              className="h-64 w-full resize-none rounded-lg border border-border bg-surface p-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-surface"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {copied ? "✓ 복사됨" : "📋 다시 복사"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
