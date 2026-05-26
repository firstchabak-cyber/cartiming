import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
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

  const { data: photo } = await supabase
    .from("vehicle_photos")
    .select("id, storage_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // Storage 파일 삭제 시도 (실패해도 메타데이터 삭제는 진행)
  await supabase.storage.from("vehicle-photos").remove([photo.storage_path]);

  const { error: dbError } = await supabase
    .from("vehicle_photos")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
