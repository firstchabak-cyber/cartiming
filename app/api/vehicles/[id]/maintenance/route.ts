import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_PARTS,
  MAINTENANCE_CATEGORIES,
} from "@/lib/constants/maintenance";

const postSchema = z.object({
  category: z.enum(MAINTENANCE_CATEGORIES),
  part: z.string().refine((v) => ALL_PARTS.includes(v), {
    message: "유효한 부위를 선택해주세요",
  }),
  description: z.string().trim().max(500).optional().nullable(),
  performed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  cost: z.number().int().nonnegative().nullable().optional(),
});

export async function POST(
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

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
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
  const { data, error } = await supabase
    .from("vehicle_maintenance")
    .insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      category: input.category,
      part: input.part,
      description: input.description ?? null,
      performed_at: input.performed_at,
      cost: input.cost ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
