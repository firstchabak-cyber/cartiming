import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const QUOTE_SOURCES = [
  "heydealer",
  "kcar",
  "cazza",
  "encar",
  "kb_chacha",
  "other",
] as const;

const schema = z.object({
  source: z.enum(QUOTE_SOURCES),
  sourceLabel: z.string().trim().max(50).optional(),
  quotedPrice: z.number().int().positive(),
  quotedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("vehicle_external_quotes")
    .select("id, source, source_label, quoted_price, quoted_at, notes, created_at")
    .eq("vehicle_id", params.id)
    .eq("user_id", user.id)
    .order("quoted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ quotes: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  // 본인 차량 확인
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json({ error: "차량 없음" }, { status: 404 });
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
      { error: "입력값 오류", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("vehicle_external_quotes")
    .insert({
      vehicle_id: params.id,
      user_id: user.id,
      source: parsed.data.source,
      source_label: parsed.data.sourceLabel ?? null,
      quoted_price: parsed.data.quotedPrice,
      quoted_at: parsed.data.quotedAt,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
