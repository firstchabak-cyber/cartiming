import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/** 관리자가 딜러 구매요청을 반려 */
export async function POST(
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
  const parsed = schema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const admin = createAdminClient();
  const { data: w } = await admin
    .from("dealer_wanted")
    .select("id, dealer_id, manufacturer, model")
    .eq("id", params.id)
    .maybeSingle();
  if (!w) return NextResponse.json({ error: "요청 없음" }, { status: 404 });

  await admin
    .from("dealer_wanted")
    .update({ status: "rejected", reject_reason: reason ?? null })
    .eq("id", params.id);

  // 딜러에게 반려 알림
  await admin.from("notifications").insert({
    user_id: w.dealer_id,
    type: "system",
    title: "구매요청이 반려되었습니다",
    message:
      `"${w.manufacturer} ${w.model}" 구매요청이 반려되었습니다.` +
      (reason ? `\n사유: ${reason}` : ""),
  });

  return NextResponse.json({ ok: true });
}
