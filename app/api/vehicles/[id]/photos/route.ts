import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  storage_path: z.string().min(1).max(500),
  sort_order: z.number().int().nonnegative().optional(),
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

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  // 첫 세그먼트가 user.id와 일치해야 함 (RLS 정책과 일치)
  const firstSegment = parsed.data.storage_path.split("/")[0];
  if (firstSegment !== user.id) {
    return NextResponse.json(
      { error: "잘못된 경로입니다" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("vehicle_photos")
    .insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      storage_path: parsed.data.storage_path,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select("id, storage_path, sort_order, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
