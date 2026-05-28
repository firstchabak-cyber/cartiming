import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  storage_path: z.string().min(1),
  sort_order: z.number().int().nonnegative(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

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

  // 본인 매각 신청인지 확인
  const { data: sale } = await supabase
    .from("sale_requests")
    .select("id, user_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sale) {
    return NextResponse.json(
      { error: "매각 신청을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("sale_photos")
    .insert({
      sale_request_id: params.id,
      user_id: user.id,
      storage_path: parsed.data.storage_path,
      sort_order: parsed.data.sort_order,
    })
    .select("id, storage_path, sort_order")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "메타 저장 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
