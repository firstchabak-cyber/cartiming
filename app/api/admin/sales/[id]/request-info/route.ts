import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({ note: z.string().trim().min(1).max(1000) });

/** 관리자: 매각 신청에 추가 입력(보완) 요청 — 코멘트 저장 + 차주 알림. 상태는 유지. */
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "요청 내용을 입력해주세요" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sale_requests")
    .select("id, user_id, vehicle_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) return NextResponse.json({ error: "신청 없음" }, { status: 404 });

  await admin
    .from("sale_requests")
    .update({ admin_note: parsed.data.note })
    .eq("id", params.id);

  // 차주에게 인앱+이메일 알림
  await createAndDispatch(admin, {
    userId: sale.user_id,
    vehicleId: sale.vehicle_id,
    type: "system",
    title: "📝 매각 신청에 보완이 필요해요",
    message:
      `운영자가 매각 신청 내용 보완을 요청했습니다.\n요청 내용: ${parsed.data.note}\n` +
      `내 차고에서 차량 정보를 보완한 뒤 다시 신청해 주세요.`,
    email: true,
  });

  return NextResponse.json({ ok: true });
}
