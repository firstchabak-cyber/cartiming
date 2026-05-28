import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  businessName: z.string().trim().min(1).max(100),
  businessRegNumber: z.string().trim().min(8).max(20),
  contactPhone: z.string().trim().min(1),
  location: z.string().trim().optional(),
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
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("dealers").upsert(
    {
      user_id: user.id,
      business_name: parsed.data.businessName,
      business_reg_number: parsed.data.businessRegNumber,
      contact_phone: parsed.data.contactPhone,
      location: parsed.data.location ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json(
      { error: "딜러 등록 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, verified: false });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const { data } = await supabase
    .from("dealers")
    .select(
      "business_name, business_reg_number, contact_phone, location, verified, rating_avg, rating_count, created_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ dealer: data });
}
