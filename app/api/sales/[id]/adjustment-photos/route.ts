import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  storage_path: z.string().min(1),
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
