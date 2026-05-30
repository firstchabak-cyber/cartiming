import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { logDeletion } from "@/lib/admin/deletion-log";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    business_name: z.string().trim().min(1).optional(),
    business_reg_number: z.string().trim().min(1).optional(),
    contact_phone: z.string().trim().min(1).optional(),
    location: z.string().trim().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "수정할 항목이 없습니다" });

/** 관리자: 딜러 사업자 정보 수정 */
export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값 오류" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("dealers")
    .update(parsed.data)
    .eq("user_id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ reason: z.string().trim().min(1).max(500) });

/** 관리자: 딜러 등록 삭제 (사유 필수. 입찰·수수료 이력은 보존). */
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {}
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "삭제 사유를 입력해주세요" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: dealer } = await admin
    .from("dealers")
    .select("business_name")
    .eq("user_id", params.id)
    .maybeSingle();

  await logDeletion(admin, {
    adminId: user.id,
    adminEmail: user.email ?? null,
    targetType: "dealer",
    targetId: params.id,
    targetLabel: dealer?.business_name ?? params.id,
    reason: parsed.data.reason,
  });

  const { error } = await admin
    .from("dealers")
    .delete()
    .eq("user_id", params.id);
  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ reason: z.string().trim().min(1).max(500) });

/** 관리자: 딜러 등록 삭제 (사유 필수. 입찰·수수료 이력은 보존). */
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {}
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "삭제 사유를 입력해주세요" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: dealer } = await admin
    .from("dealers")
    .select("business_name")
    .eq("user_id", params.id)
    .maybeSingle();

  await logDeletion(admin, {
    adminId: user.id,
    adminEmail: user.email ?? null,
    targetType: "dealer",
    targetId: params.id,
    targetLabel: dealer?.business_name ?? params.id,
    reason: parsed.data.reason,
  });

  const { error } = await admin
    .from("dealers")
    .delete()
    .eq("user_id", params.id);
  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
