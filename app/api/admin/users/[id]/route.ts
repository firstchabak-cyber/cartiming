import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { logDeletion } from "@/lib/admin/deletion-log";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(1).max(500) });

/**
 * 관리자: 고객 계정 완전 삭제. (사유 필수)
 * auth.users 삭제 → cascade 로 vehicles/credits/notifications 등 함께 삭제됨.
 * 삭제 전 사유를 admin_deletion_log 에 기록.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  if (params.id === user.id) {
    return NextResponse.json(
      { error: "본인 계정은 삭제할 수 없습니다" },
      { status: 400 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {}
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "삭제 사유를 입력해주세요" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 라벨용 정보 먼저 조회 (삭제 전)
  const { data: profile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", params.id)
    .maybeSingle();
  const label = profile
    ? `${profile.name ?? ""} ${profile.email ?? ""}`.trim()
    : params.id;

  await logDeletion(admin, {
    adminId: user.id,
    adminEmail: user.email ?? null,
    targetType: "user",
    targetId: params.id,
    targetLabel: label,
    reason: parsed.data.reason,
  });

  const { error } = await admin.auth.admin.deleteUser(params.id, false);
  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
