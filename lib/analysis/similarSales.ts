import { createClient } from "@/lib/supabase/server";

export type PlateCategory = "private" | "rental" | "commercial" | null;

export type SimilarSale = {
  channel: "cartiming" | "external";
  sold_price: number;
  sold_at: string;
  snapshot_year: number;
  snapshot_mileage: number;
  snapshot_damage_count: number;
  snapshot_plate_category: PlateCategory;
};

const PLATE_LABEL: Record<string, string> = {
  private: "자가용",
  rental: "렌터카",
  commercial: "영업용",
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
      "channel, sold_price, sold_at, snapshot_year, snapshot_mileage, snapshot_damage_count, snapshot_plate_category",
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

/**
 * 본 차량의 영업용 분류와 같은 카테고리를 우선 표시.
 * 같은 카테고리 데이터가 부족하면 다른 카테고리도 보여주되 시각적으로 구분.
 */
export function formatSimilarSalesForPrompt(
  sales: SimilarSale[],
  ownPlateCategory?: PlateCategory,
): string {
  if (sales.length === 0) {
    return "비슷한 차량의 실거래 매각 데이터: 없음 (참고할 누적 데이터 없음)";
  }

  // 본 차량과 같은 카테고리 / 다른 카테고리로 분리
  const sameCategory = ownPlateCategory
    ? sales.filter((s) => s.snapshot_plate_category === ownPlateCategory)
    : sales;
  const otherCategory = ownPlateCategory
    ? sales.filter((s) => s.snapshot_plate_category !== ownPlateCategory)
    : [];

  const renderLine = (s: SimilarSale) => {
    const km = s.snapshot_mileage.toLocaleString("ko-KR");
    const price = s.sold_price.toLocaleString("ko-KR");
    const dmg =
      s.snapshot_damage_count > 0
        ? ` 외판손상 ${s.snapshot_damage_count}곳`
        : " 외판무사고";
    const ch = s.channel === "cartiming" ? "[카타이밍]" : "[외부]";
    const plate = s.snapshot_plate_category
      ? `[${PLATE_LABEL[s.snapshot_plate_category]}]`
      : "[차종미분류]";
    return `- ${s.sold_at} ${ch}${plate} ${s.snapshot_year}년식 · ${km} km${dmg} → ${price}원`;
  };

  const ownLabel = ownPlateCategory ? PLATE_LABEL[ownPlateCategory] : "미분류";
  const sections: string[] = [];

  if (sameCategory.length > 0) {
    sections.push(
      `🎯 본 차량과 같은 분류 (${ownLabel}) 매각가 — 시세 추정의 **1순위** 근거:
${sameCategory.map(renderLine).join("\n")}`,
    );
  } else if (ownPlateCategory) {
    sections.push(
      `🎯 본 차량과 같은 분류 (${ownLabel}) 매각가: 없음 (해당 분류 누적 데이터 부족)`,
    );
  }

  if (otherCategory.length > 0) {
    sections.push(
      `📊 다른 분류 매각가 (보조 참고 — 영업용/자가용 가격차 존재):
${otherCategory.map(renderLine).join("\n")}`,
    );
  }

  return `비슷한 차량 실거래 매각 데이터 (최근 18개월, 동일 모델 ±2년식):

${sections.join("\n\n")}

[활용 원칙]
- **같은 분류 매각가 (자가용↔자가용, 렌터카↔렌터카)** 가 가장 정확한 벤치마크입니다.
- 다른 분류 데이터는 그대로 사용하지 말고 본 차량 분류에 맞게 보정해서 참고.
- 외부 매각가는 차주 자기 신고이므로 ±5% 범위로 보정 가능합니다.`;
}
