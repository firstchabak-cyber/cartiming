import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 후기를 쓸 수 있는 내 차량 목록.
 * - 과거에 시세 분석을 한 적이 있으면(재분석 불필요) 바로 후기 작성 가능
 * - 이미 후기를 등록한 차량(반려 제외)은 alreadyReviewed 로 표시
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, manufacturer, model, trim, year, mileage")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const list = vehicles ?? [];
  if (list.length === 0) return NextResponse.json({ cars: [] });

  const ids = list.map((v) => v.id);

  const [{ data: analyses }, { data: reviews }] = await Promise.all([
    supabase
      .from("price_analyses")
      .select("vehicle_id, current_price, signal, generated_at")
      .eq("user_id", user.id)
      .in("vehicle_id", ids)
      .order("generated_at", { ascending: false }),
    supabase
      .from("analysis_reviews")
      .select("vehicle_id, status")
      .eq("user_id", user.id)
      .neq("status", "rejected"),
  ]);

  // 차량별 최신 분석 1건
  const latest = new Map<string, { current_price: number; signal: string }>();
  for (const a of (analyses as Array<{
    vehicle_id: string;
    current_price: number;
    signal: string;
  }>) ?? []) {
    if (!latest.has(a.vehicle_id))
      latest.set(a.vehicle_id, { current_price: a.current_price, signal: a.signal });
  }

  const reviewed = new Set(
    ((reviews as Array<{ vehicle_id: string }>) ?? []).map((r) => r.vehicle_id),
  );

  const cars = list.map((v) => {
    const a = latest.get(v.id);
    return {
      id: v.id,
      summary: `${v.manufacturer} ${v.model}${v.trim ? " " + v.trim : ""} · ${v.year}년식 · ${v.mileage.toLocaleString("ko-KR")}km`,
      hasAnalysis: !!a,
      currentPrice: a?.current_price ?? null,
      signal: a?.signal ?? null,
      alreadyReviewed: reviewed.has(v.id),
    };
  });

  return NextResponse.json({ cars });
}
