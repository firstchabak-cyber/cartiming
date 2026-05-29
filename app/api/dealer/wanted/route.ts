import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  manufacturer: z.string().trim().min(1, "제조사를 입력하세요").max(50),
  model: z.string().trim().min(1, "모델을 입력하세요").max(50),
  yearMin: z.number().int().min(1900).max(2100).nullable().optional(),
  yearMax: z.number().int().min(1900).max(2100).nullable().optional(),
  maxMileage: z.number().int().min(0).nullable().optional(),
  maxPrice: z.number().int().positive().nullable().optional(),
  region: z.string().trim().max(100).optional(),
  memo: z.string().trim().max(1000).optional(),
  /** 모집 기간(일). null/0 = 상시 */
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 딜러 + 인증 여부 확인
  const { data: dealer } = await supabase
    .from("dealers")
    .select("user_id, business_name, verified")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) {
    return NextResponse.json({ error: "딜러만 등록할 수 있습니다" }, { status: 403 });
  }
  if (!dealer.verified) {
    return NextResponse.json(
      { error: "운영자 인증 완료 후 등록할 수 있습니다" },
      { status: 403 },
    );
  }

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
  const d = parsed.data;

  if (d.yearMin != null && d.yearMax != null && d.yearMin > d.yearMax) {
    return NextResponse.json(
      { error: "연식 범위가 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const expiresAt =
    d.durationDays && d.durationDays > 0
      ? new Date(Date.now() + d.durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("dealer_wanted")
    .insert({
      dealer_id: user.id,
      dealer_name: dealer.business_name,
      manufacturer: d.manufacturer,
      model: d.model,
      year_min: d.yearMin ?? null,
      year_max: d.yearMax ?? null,
      max_mileage: d.maxMileage ?? null,
      max_price: d.maxPrice ?? null,
      region: d.region || null,
      memo: d.memo || null,
      expires_at: expiresAt,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "등록 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
