import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { logDeletion } from "@/lib/admin/deletion-log";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    manufacturer: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    trim: z.string().trim().nullable().optional(),
    year: z
      .number()
      .int()
      .gte(1900)
      .lte(new Date().getFullYear() + 1)
      .optional(),
    mileage: z.number().int().nonnegative().optional(),
    plate_number: z.string().trim().nullable().optional(),
    fuel_type: z
      .enum(["gasoline", "diesel", "hybrid", "ev", "lpg"])
      .nullable()
      .optional(),
    transmission: z.enum(["auto", "manual"]).nullable().optional(),
    color: z.string().trim().nullable().optional(),
    status: z.enum(["active", "sold", "deleted"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "수정할 항목이 없습니다" });

/** 관리자: 임의 고객 차량 수정 (RLS 우회 admin client) */
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
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "sold") update.sold_at = new Date().toISOString();
  if (parsed.data.status === "active") update.sold_at = null;

  const { error } = await admin
    .from("vehicles")
    .update(update)
    .eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ reason: z.string().trim().min(1).max(500) });

/** 관리자: 차량 완전 삭제 (사유 필수. 연관 분석·정비·사진 cascade). */
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
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("manufacturer, model, plate_number")
    .eq("id", params.id)
    .maybeSingle();
  const label = vehicle
    ? `${vehicle.manufacturer} ${vehicle.model}${vehicle.plate_number ? ` (${vehicle.plate_number})` : ""}`
    : params.id;

  await logDeletion(admin, {
    adminId: user.id,
    adminEmail: user.email ?? null,
    targetType: "vehicle",
    targetId: params.id,
    targetLabel: label,
    reason: parsed.data.reason,
  });

  const { error } = await admin.from("vehicles").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
