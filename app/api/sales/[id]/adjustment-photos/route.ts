import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  storage_path: z.string().min(1).max(500),
  sort_order: z.number().int().nonnegative(),
  caption: z.string().trim().max(200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }
  // 본인 폴더(user_id/...) 경로만 허용
  if (parsed.data.storage_path.split("/")[0] !== user.id) {
    return NextResponse.json({ error: "잘못된 파일 경로" }, { status: 400 });
  }

  // 이 매물의 '선정된 딜러' 본인만 감가 증빙 업로드 가능 (RLS 외 앱 레벨 방어)
  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sale_requests")
    .select("id, status, selected_bid_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale || sale.status !== "matched" || !sale.selected_bid_id) {
    return NextResponse.json(
      { error: "감가 증빙을 올릴 수 있는 상태가 아닙니다" },
      { status: 400 },
    );
  }
  const { data: bid } = await admin
    .from("sale_bids")
    .select("dealer_id")
    .eq("id", sale.selected_bid_id)
    .maybeSingle();
  if (!bid || bid.dealer_id !== user.id) {
    return NextResponse.json(
      { error: "선정된 딜러만 업로드할 수 있습니다" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("sale_adjustment_photos")
    .insert({
      sale_request_id: params.id,
      dealer_id: user.id,
      storage_path: parsed.data.storage_path,
      sort_order: parsed.data.sort_order,
      caption: parsed.data.caption ?? null,
    })
    .select("id, storage_path, sort_order, caption")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "메타 저장 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
