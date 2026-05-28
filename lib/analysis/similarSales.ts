import { createClient } from "@/lib/supabase/server";

export type SimilarSale = {
  channel: "cartiming" | "external";
  sold_price: number;
  sold_at: string;
  snapshot_year: number;
  snapshot_mileage: number;
  snapshot_damage_count: number;
};

/**
 * 같은 제조사+모델의 과거 매각 거래 N건 반환 (최근순).
 * 연식 ±2년 이내, 최근 18개월 이내, 최대 10건.
 */
export async function getSimilarSales(args: {
  manufacturer: string;
  model: string;
  year: number;
  limit?: number;
}): Promise<SimilarSale[]> {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);

  const { data } = await supabase
    .from("sale_transactions")
    .select(
      "channel, sold_price, sold_at, snapshot_year, snapshot_mileage, snapshot_damage_count",
    )
    .eq("snapshot_manufacturer", args.manufacturer)
    .eq("snapshot_model", args.model)
    .gte("snapshot_year", args.year - 2)
    .lte("snapshot_year", args.year + 2)
    .gte("sold_at", cutoff.toISOString().slice(0, 10))
    .order("sold_at", { ascending: false })
    .limit(args.limit ?? 10);

  return (data ?? []) as SimilarSale[];
}

export function formatSimilarSalesForPrompt(sales: SimilarSale[]): string {
  if (sales.length === 0) {
    return "비슷한 차량의 실거래 매각 데이터: 없음 (참고할 누적 데이터 없음)";
  }
  const lines = sales.map((s) => {
    const km = s.snapshot_mileage.toLocaleString("ko-KR");
    const price = s.sold_price.toLocaleString("ko-KR");
    const dmg = s.snapshot_damage_count > 0 ? ` 외판손상 ${s.snapshot_damage_count}곳` : " 외판무사고";
    const ch = s.channel === "cartiming" ? "[카타이밍]" : "[외부]";
    return `- ${s.sold_at} ${ch} ${s.snapshot_year}년식 · ${km} km${dmg} → ${price}원`;
  });
  return `비슷한 차량 실거래 매각 데이터 (최근 18개월, 동일 모델 ±2년식):
${lines.join("\n")}

위 실거래 데이터를 시세 추정의 1차 근거로 사용하세요. 외부 매각가는 차주 자기 신고이므로 ±5% 범위로 보정 가능합니다.`;
}
