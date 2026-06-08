import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVehicleSlots, spendCredits } from "@/lib/credits/server";
import { CREDIT_COSTS } from "@/lib/credits/constants";
import { CAR_BODY_PARTS, DAMAGE_STATES } from "@/lib/constants/damage";

const vehicleSchema = z.object({
  manufacturer: z.string().trim().min(1, "제조사를 입력해주세요"),
  model: z.string().trim().min(1, "모델명을 입력해주세요"),
  year: z
    .number()
    .int()
    .gte(1900, "올바른 연식을 입력해주세요")
    .lte(new Date().getFullYear() + 1, "올바른 연식을 입력해주세요"),
  mileage: z.number().int().nonnegative("주행거리는 0 이상이어야 합니다"),
  trim: z.string().trim().min(1).optional(),
  fuel_type: z.enum(["gasoline", "diesel", "hybrid", "ev", "lpg"]).optional(),
  transmission: z.enum(["auto", "manual"]).optional(),
  color: z.string().trim().min(1).optional(),
  interior_color: z.string().trim().min(1).optional(),
  plate_number: z.string().trim().min(1).optional(),
  registered_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  vin: z.string().trim().min(11).max(17).optional(),
  displacement_cc: z.number().int().positive().optional(),
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
    .optional(),
  vehicle_class: z
    .enum(["passenger", "van", "truck", "special"])
    .optional(),
  engine_code: z.string().trim().min(1).optional(),
  inspection_valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  seating_capacity: z.number().int().gte(1).lte(60).optional(),
  key_count: z.number().int().gte(0).lte(10).nullable().optional(),
  wheel_scuff_count: z.number().int().gte(0).lte(4).nullable().optional(),
  damage_note: z.string().trim().max(2000).nullable().optional(),
  damage_map: z
    .record(
      z.enum(CAR_BODY_PARTS as unknown as [string, ...string[]]),
      z.enum(DAMAGE_STATES as unknown as [string, ...string[]]),
    )
    .optional(),
  options: z.array(z.string().trim().min(1)).optional(),
  purchase_price: z.number().int().nonnegative().optional(),
  loan_principal: z.number().int().nonnegative().optional(),
  loan_started_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  loan_months: z.number().int().gte(1).lte(240).optional(),
  loan_apr: z.number().gte(0).lte(30).optional(),
});

export async function POST(request: Request) {
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

  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const registeredAt = input.registered_at ?? `${input.year}-01-01`;

  // 무료 슬롯 체크 — 초과하면 캐시 차감
  const slots = await getVehicleSlots(user.id);
  if (!slots.canAddFree) {
    const spend = await spendCredits({
      amount: CREDIT_COSTS.addVehicle,
      type: "add_vehicle",
      description: `차량 추가 등록 (${slots.activeCount + 1}대째)`,
    });
    if (!spend.ok) {
      return NextResponse.json(
        {
          error:
            spend.reason === "insufficient_credits"
              ? `무료 차량 슬롯 ${slots.freeSlots}대를 모두 사용했습니다. 추가 등록은 ${CREDIT_COSTS.addVehicle} 캐시가 필요해요.`
              : spend.message,
          code: spend.reason,
          required: CREDIT_COSTS.addVehicle,
        },
        { status: 402 },
      );
    }
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      manufacturer: input.manufacturer,
      model: input.model,
      year: input.year,
      mileage: input.mileage,
      trim: input.trim ?? null,
      fuel_type: input.fuel_type ?? null,
      transmission: input.transmission ?? null,
      color: input.color ?? null,
      interior_color: input.interior_color ?? null,
      plate_number: input.plate_number ?? null,
      registered_at: registeredAt,
      vin: input.vin ?? null,
      displacement_cc: input.displacement_cc ?? null,
      body_type: input.body_type ?? null,
      vehicle_class: input.vehicle_class ?? null,
      engine_code: input.engine_code ?? null,
      inspection_valid_until: input.inspection_valid_until ?? null,
      seating_capacity: input.seating_capacity ?? null,
      key_count: input.key_count ?? null,
      wheel_scuff_count: input.wheel_scuff_count ?? null,
      damage_note: input.damage_note ?? null,
      damage_map: input.damage_map ?? {},
      options: input.options && input.options.length > 0 ? input.options : null,
      purchase_price: input.purchase_price ?? null,
      loan_principal: input.loan_principal ?? null,
      loan_started_at: input.loan_started_at ?? null,
      loan_months: input.loan_months ?? null,
      loan_apr: input.loan_apr ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "차량 저장에 실패했습니다", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
