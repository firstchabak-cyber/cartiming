import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

const schema = z.object({
  transactionId: z.string().uuid(),
  status: z.enum(["uncharged", "charged", "paid", "waived"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    fee_status: parsed.data.status,
  };
  if (parsed.data.note !== undefined) update.fee_note = parsed.data.note;
  if (parsed.data.status === "charged") update.fee_charged_at = now;
  if (parsed.data.status === "paid") update.fee_paid_at = now;
  if (parsed.data.status === "uncharged") {
    update.fee_charged_at = null;
    update.fee_paid_at = null;
  }

  const { error } = await admin
    .from("sale_transactions")
    .update(update)
    .eq("id", parsed.data.transactionId);

  if (error) {
    return NextResponse.json(
      { error: "상태 변경 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
