import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("vehicles")
    .update(parsed.data)
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
