import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CAR_BODY_PARTS, DAMAGE_STATES } from "@/lib/constants/damage";
import { classifyPlate } from "@/lib/analysis/prompt";

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
    options: z.array(z.string().trim().min(1)).nullable().optional(),
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
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, damage_map, plate_number",
    )
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

  // 카타이밍 통한 매각 (matched 상태였던 sale_request 가 있는 차량의 status=sold 전환)
  // → 영구 무료 슬롯 +1 + sale_transactions 에 거래 기록 추가
  if (parsed.data.status === "sold") {
    const admin = createAdminClient();
    const { data: matchedRequest } = await admin
      .from("sale_requests")
      .select("id, selected_bid_id")
      .eq("vehicle_id", params.id)
      .eq("status", "matched")
      .maybeSingle();

    if (matchedRequest?.selected_bid_id) {
      // 입찰가 가져오기
      const { data: bid } = await admin
        .from("sale_bids")
        .select("bid_amount")
        .eq("id", matchedRequest.selected_bid_id)
        .maybeSingle();

      if (bid) {
        const damageMap =
          data.damage_map && typeof data.damage_map === "object"
            ? (data.damage_map as Record<string, string>)
            : {};
        const damageCount = Object.values(damageMap).filter(
          (s) => s && s !== "없음",
        ).length;
        const plateInfo = classifyPlate(data.plate_number);

        await admin.from("sale_transactions").insert({
          user_id: user.id,
          vehicle_id: params.id,
          source_sale_request_id: matchedRequest.id,
          channel: "cartiming",
          sold_price: bid.bid_amount,
          sold_at: new Date().toISOString().slice(0, 10),
          buyer_type: "dealer",
          snapshot_manufacturer: data.manufacturer,
          snapshot_model: data.model,
          snapshot_trim: data.trim,
          snapshot_year: data.year,
          snapshot_mileage: data.mileage,
          snapshot_fuel_type: data.fuel_type,
          snapshot_transmission: data.transmission,
          snapshot_body_type: data.body_type,
          snapshot_damage_count: damageCount,
          snapshot_plate_category:
            plateInfo.category === "unknown" ? null : plateInfo.category,
        });

        await admin
          .from("sale_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", matchedRequest.id);

        // 영구 슬롯 +1
        const { data: credits } = await admin
          .from("user_credits")
          .select("permanent_free_slots")
          .eq("user_id", user.id)
          .maybeSingle();
        const currentSlots = credits?.permanent_free_slots ?? 0;
        await admin
          .from("user_credits")
          .upsert(
            {
              user_id: user.id,
              permanent_free_slots: currentSlots + 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        await admin.from("credit_transactions").insert({
          user_id: user.id,
          type: "admin_grant",
          amount: 0,
          balance_after: credits ? credits.permanent_free_slots ?? 0 : 0,
          description: "카타이밍 매각 완료 — 영구 무료 차량 슬롯 +1",
          ref_id: matchedRequest.id,
        });
      }
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
