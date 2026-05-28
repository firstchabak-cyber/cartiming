import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

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
    .select("id, status")
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

  return NextResponse.json({
    ok: true,
    bidding_closes_at: closes.toISOString(),
  });
}
