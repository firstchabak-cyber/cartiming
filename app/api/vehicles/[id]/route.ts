import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CAR_BODY_PARTS, DAMAGE_STATES } from "@/lib/constants/damage";
import { completeSale } from "@/lib/sales/complete";

const patchSchema = z
  .object({
    manufacturer: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    trim: z.string().trim().min(1).nullable().optional(),
    year: z
      .number()
      .int()
      .gte(1900)
      .lte(new Date().getFullYear() + 1)
      .optional(),
    mileage: z.number().int().nonnegative().optional(),
    registered_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fuel_type: z
      .enum(["gasoline", "diesel", "hybrid", "ev", "lpg"])
      .nullable()
      .optional(),
    transmission: z.enum(["auto", "manual"]).nullable().optional(),
    color: z.string().trim().min(1).nullable().optional(),
    interior_color: z.string().trim().min(1).nullable().optional(),
    plate_number: z.string().trim().min(1).nullable().optional(),
    vin: z.string().trim().min(11).max(17).nullable().optional(),
    displacement_cc: z.number().int().positive().nullable().optional(),
    body_type: z
      .enum([
        "sedan",
        "suv",
        "hatchback",
        "coupe",
        "wagon",
        "van",
        "pickup",
        "convertible",
        "other",
      ])
      .nullable()
      .optional(),
    vehicle_class: z
      .enum(["passenger", "van", "truck", "special"])
      .nullable()
      .optional(),
    engine_code: z.string().trim().min(1).nullable().optional(),
    inspection_valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    seating_capacity: z.number().int().gte(1).lte(60).nullable().optional(),
    key_count: z.number().int().gte(0).lte(10).nullable().optional(),
    wheel_scuff: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).nullable().optional(),
    purchase_price: z.number().int().nonnegative().nullable().optional(),
    loan_principal: z.number().int().nonnegative().nullable().optional(),
    loan_started_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    loan_months: z.number().int().gte(1).lte(240).nullable().optional(),
    loan_apr: z.number().gte(0).lte(30).nullable().optional(),
    damage_map: z
      .record(
        z.enum(CAR_BODY_PARTS as unknown as [string, ...string[]]),
        z.enum(DAMAGE_STATES as unknown as [string, ...string[]]),
      )
      .optional(),
    status: z.enum(["active", "sold"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "수정할 항목이 없습니다",
  });

export async function PATCH(
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
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const updatePayload: Record<string, unknown> = { ...parsed.data };
  // 상태 전환 시 sold_at 자동 처리
  if (parsed.data.status === "sold") {
    updatePayload.sold_at = new Date().toISOString();
  } else if (parsed.data.status === "active") {
    updatePayload.sold_at = null;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update(updatePayload)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // 카타임 통한 매각: matched 상태 sale_request 가 있으면 완료 처리를 위임한다.
  // 거래기록 생성 + 영구 슬롯 +1 은 completeSale 한 곳에서만 수행 (중복 방지).
  // sale_transactions.source_sale_request_id 의 UNIQUE 제약이 동시성 이중 처리를 막는다.
  if (parsed.data.status === "sold") {
    const admin = createAdminClient();
    const { data: matchedRequest } = await admin
      .from("sale_requests")
      .select("id")
      .eq("vehicle_id", params.id)
      .eq("status", "matched")
      .maybeSingle();
    if (matchedRequest) {
      await completeSale({
        saleRequestId: matchedRequest.id,
        callerId: user.id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

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

  const { error, count } = await supabase
    .from("vehicles")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (count === 0) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
