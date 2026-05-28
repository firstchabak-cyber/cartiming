import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  // 본인 사진인지 확인
  const { data: photo } = await supabase
    .from("sale_photos")
    .select("id, user_id, storage_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // 스토리지 파일 삭제 (admin 클라이언트 — 서비스 롤 권한)
  const admin = createAdminClient();
  await admin.storage.from("sale-photos").remove([photo.storage_path]);
  await admin.from("sale_photos").delete().eq("id", photo.id);

  return NextResponse.json({ ok: true });
}
