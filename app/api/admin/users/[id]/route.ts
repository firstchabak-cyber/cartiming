import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

/**
 * 관리자: 고객 계정 완전 삭제.
 * auth.users 삭제 → on delete cascade 로 vehicles/credits/notifications 등 연관 데이터도 함께 삭제됨.
 * 되돌릴 수 없음.
 */
export async function DELETE(
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

  // 관리자 본인 계정은 실수 삭제 방지
  if (params.id === user.id) {
    return NextResponse.json(
      { error: "본인 계정은 삭제할 수 없습니다" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // hard delete (두 번째 인자 false = 소프트삭제 아님)
  const { error } = await admin.auth.admin.deleteUser(params.id, false);
  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
