import { createAdminClient } from "@/lib/supabase/server";

export type QuoteSource =
  | "heydealer"
  | "kcar"
  | "cazza"
  | "encar"
  | "kb_chacha"
  | "other";

const SOURCE_LABEL: Record<QuoteSource, string> = {
  heydealer: "헤이딜러",
  kcar: "케이카",
  cazza: "카자",
  encar: "엔카",
  kb_chacha: "KB차차차",
  other: "기타",
};

export type ExternalQuote = {
  id: string;
  source: string;
  source_label: string | null;
  quoted_price: number;
  quoted_at: string;
  notes: string | null;
};

export type CrowdQuoteStat = {
  source: string;
  count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
};

/**
 * 본 차량에 대해 차주가 직접 입력한 외부 견적 (헤이딜러·케이카 등) 목록.
 */
export async function getOwnVehicleQuotes(
  vehicleId: string,
  userId: string,
): Promise<ExternalQuote[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vehicle_external_quotes")
    .select("id, source, source_label, quoted_price, quoted_at, notes")
    .eq("vehicle_id", vehicleId)
    .eq("user_id", userId)
    .order("quoted_at", { ascending: false })
    .limit(20);
  return (data ?? []) as ExternalQuote[];
}

/**
 * 같은 차종 (제조사+모델, ±2년식) 의 다른 사용자가 입력한 외부 견적 집계.
 * 출처별 평균·최소·최대.
 */
export async function getCrowdQuoteStats(args: {
  manufacturer: string;
  model: string;
  year: number;
}): Promise<CrowdQuoteStat[]> {
  const admin = createAdminClient();

  // 같은 차종의 최근 6개월 견적 가져오기 (vehicles 조인)
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);

  const { data: matchingVehicles } = await admin
    .from("vehicles")
    .select("id")
    .eq("manufacturer", args.manufacturer)
    .eq("model", args.model)
    .gte("year", args.year - 2)
    .lte("year", args.year + 2);

  const vehicleIds = (matchingVehicles ?? []).map((v: { id: string }) => v.id);
  if (vehicleIds.length === 0) return [];

  const { data: quotes } = await admin
    .from("vehicle_external_quotes")
    .select("source, quoted_price")
    .in("vehicle_id", vehicleIds)
    .gte("quoted_at", cutoff.toISOString().slice(0, 10));

  const list = (quotes ?? []) as Array<{ source: string; quoted_price: number }>;
  if (list.length === 0) return [];

  const bySource = new Map<string, number[]>();
  for (const q of list) {
    if (!bySource.has(q.source)) bySource.set(q.source, []);
    bySource.get(q.source)!.push(q.quoted_price);
  }

  const stats: CrowdQuoteStat[] = [];
  for (const [source, prices] of bySource.entries()) {
    const sum = prices.reduce((a, b) => a + b, 0);
    stats.push({
      source,
      count: prices.length,
      avg_price: Math.round(sum / prices.length),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
    });
  }
  stats.sort((a, b) => b.count - a.count);
  return stats;
}

export function formatExternalQuotesForPrompt(args: {
  ownQuotes: ExternalQuote[];
  crowdStats: CrowdQuoteStat[];
}): string {
  const sections: string[] = [];

  if (args.ownQuotes.length > 0) {
    sections.push(
      `🎯 차주가 직접 입력한 본 차량 외부 견적 — **시세 추정의 0순위 (가장 정확)**:
${args.ownQuotes
  .map((q) => {
    const label = SOURCE_LABEL[q.source as QuoteSource] ?? q.source;
    const note = q.notes ? ` (${q.notes})` : "";
    return `- ${q.quoted_at} ${label}: ${q.quoted_price.toLocaleString("ko-KR")}원${note}`;
  })
  .join("\n")}

[활용 원칙]
- 위 견적은 실제 매입 플랫폼이 본 차량을 평가해서 부른 가격입니다.
- current_price 는 위 견적들의 **중앙값 ±5% 이내** 가 되어야 합니다.
- 견적 출처에 따른 가중치: 헤이딜러·케이카 > 엔카·KB차차차 (전자가 실제 매입가, 후자는 평균 시세).`,
    );
  }

  if (args.crowdStats.length > 0) {
    sections.push(
      `📊 같은 차종 다른 사용자 외부 견적 통계 (최근 6개월, 동일 모델 ±2년식):
${args.crowdStats
  .map((s) => {
    const label = SOURCE_LABEL[s.source as QuoteSource] ?? s.source;
    return `- ${label}: ${s.count}건 · 평균 ${s.avg_price.toLocaleString("ko-KR")}원 (범위 ${s.min_price.toLocaleString("ko-KR")}~${s.max_price.toLocaleString("ko-KR")})`;
  })
  .join("\n")}

[활용 원칙]
- 위 통계는 같은 차종 평균이라 본 차량의 주행거리·외판상태 보정 후 사용.
- current_price 가 위 평균과 크게 벗어나면 (±15% 이상) 사유를 rationale 에 명시.`,
    );
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "외부 매입 플랫폼 견적: 없음 (사용자 입력 데이터 부족)";
}
