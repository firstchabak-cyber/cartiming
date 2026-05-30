import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch, createAndDispatchMany } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const BIDDING_HOURS = 48;

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
  const { data: sale } = await admin
    .from("sale_requests")
    .select(
      "id, status, user_id, vehicle_id, vehicle:vehicles(manufacturer, model, year)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (sale.status !== "pending") {
    return NextResponse.json(
      { error: `현재 상태가 ${sale.status} 라 승인 불가` },
      { status: 400 },
    );
  }

  const closes = new Date();
  closes.setHours(closes.getHours() + BIDDING_HOURS);

  const { error } = await admin
    .from("sale_requests")
    .update({
      status: "bidding",
      approved_at: new Date().toISOString(),
      bidding_closes_at: closes.toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "승인 실패", detail: error.message },
      { status: 500 },
    );
  }

  const v = (sale as { vehicle?: { manufacturer: string; model: string; year: number } | null }).vehicle;
  const carLabel = v ? `${v.manufacturer} ${v.model} (${v.year}년식)` : "신규 매물";

  // 1) 인증된 딜러 전체에게 새 매물 입찰 시작 알림 (역경매의 핵심 — 빠른 입찰 유도)
  const { data: dealers } = await admin
    .from("dealers")
    .select("user_id")
    .eq("verified", true);
  const dealerIds = (dealers ?? []).map((d: { user_id: string }) => d.user_id);
  await createAndDispatchMany(admin, {
    userIds: dealerIds,
    type: "system",
    title: "🚗 새 매물 입찰이 시작됐어요",
    message:
      `${carLabel} 매물의 입찰이 시작됐습니다 (마감 ${BIDDING_HOURS}시간).\n` +
      `매물 리스트에서 차량 정보를 확인하고 입찰해 주세요.`,
    email: true,
    ctaPath: "/dealer/listings",
  });

  // 2) 차주에게 승인 알림
  await createAndDispatch(admin, {
    userId: sale.user_id,
    vehicleId: sale.vehicle_id,
    type: "system",
    title: "✅ 매각 신청이 승인됐어요",
    message:
      `${carLabel} 매각 신청이 승인되어 지금부터 딜러 입찰을 받습니다 (마감 ${BIDDING_HOURS}시간).\n` +
      `입찰이 들어오면 알려드릴게요. 진행 상황은 앱에서 확인할 수 있어요.`,
    email: true,
  });

  return NextResponse.json({
    ok: true,
    bidding_closes_at: closes.toISOString(),
    notified_dealers: dealerIds.length,
  });
}
