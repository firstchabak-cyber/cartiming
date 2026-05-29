import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { yearRangeLabel } from "@/lib/wanted/format";

export const dynamic = "force-dynamic";

/**
 * 관리자가 딜러 구매요청을 승인.
 * 승인 시 제조사+모델(+연식 범위)이 맞는 차주들에게 알림 자동 발송.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const admin = createAdminClient();
  const { data: w } = await admin
    .from("dealer_wanted")
    .select(
      "id, status, dealer_name, manufacturer, model, year_min, year_max, max_mileage",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!w) return NextResponse.json({ error: "요청 없음" }, { status: 404 });

  await admin
    .from("dealer_wanted")
    .update({ status: "approved", approved_at: new Date().toISOString(), reject_reason: null })
    .eq("id", params.id);

  // ── 조건 맞는 차주에게 알림 (제조사+모델 정확 일치, 연식/주행 범위 적용) ──
  let matchQuery = admin
    .from("vehicles")
    .select("id, user_id, manufacturer, model, year, mileage")
    .eq("manufacturer", w.manufacturer)
    .eq("model", w.model);
  if (w.year_min != null) matchQuery = matchQuery.gte("year", w.year_min);
  if (w.year_max != null) matchQuery = matchQuery.lte("year", w.year_max);
  if (w.max_mileage != null) matchQuery = matchQuery.lte("mileage", w.max_mileage);

  const { data: matches } = await matchQuery.limit(500);

  let notified = 0;
  if (matches && matches.length > 0) {
    // 한 차주가 같은 조건 차를 여러 대 가진 경우 1건만
    const seen = new Set<string>();
    const yearLabel = yearRangeLabel(w.year_min, w.year_max);
    const rows = [];
    for (const v of matches as Array<{ id: string; user_id: string }>) {
      if (seen.has(v.user_id)) continue;
      seen.add(v.user_id);
      rows.push({
        user_id: v.user_id,
        vehicle_id: v.id,
        type: "system" as const,
        title: `🚗 내 차를 찾는 딜러가 있어요!`,
        message:
          `${w.dealer_name} 딜러가 "${w.manufacturer} ${w.model} ${yearLabel}" 차량을 구하고 있습니다.\n` +
          `내 차를 내놓으면 견적을 받아볼 수 있어요. '딜러가 찾는 차' 게시판에서 확인하세요.`,
      });
    }
    if (rows.length > 0) {
      await admin.from("notifications").insert(rows);
      notified = rows.length;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
