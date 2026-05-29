import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 딜러가 본인 구매요청을 마감(closed) 처리 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: w } = await admin
    .from("dealer_wanted")
    .select("id, dealer_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!w) return NextResponse.json({ error: "요청 없음" }, { status: 404 });
  if (w.dealer_id !== user.id) {
    return NextResponse.json({ error: "본인 요청만 마감 가능" }, { status: 403 });
  }

  await admin
    .from("dealer_wanted")
    .update({ status: "closed" })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
