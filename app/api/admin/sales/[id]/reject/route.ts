import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(1).max(1000) });

/**
 * 관리자: 매각 신청 반려(거절).
 * status 를 canceled 로 바꾸고 사유를 저장 + 차주에게 알림.
 * 보완 요청(request-info)과 달리 신청 자체를 종료한다.
 */
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
    return NextResponse.json({ error: "반려 사유를 입력해주세요" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sale_requests")
    .select("id, status, user_id, vehicle_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) return NextResponse.json({ error: "신청 없음" }, { status: 404 });
  if (sale.status === "completed" || sale.status === "matched") {
    return NextResponse.json(
      { error: `이미 ${sale.status} 상태라 반려할 수 없습니다` },
      { status: 400 },
    );
  }
  if (sale.status === "canceled") {
    return NextResponse.json({ error: "이미 반려된 신청입니다" }, { status: 400 });
  }

  const { error } = await admin
    .from("sale_requests")
    .update({ status: "canceled", admin_note: parsed.data.reason })
    .eq("id", params.id);
  if (error) {
    return NextResponse.json(
      { error: "반려 실패", detail: error.message },
      { status: 500 },
    );
  }

  // 차주에게 반려 알림
  await createAndDispatch(admin, {
    userId: sale.user_id,
    vehicleId: sale.vehicle_id,
    type: "system",
    title: "❌ 매각 신청이 반려됐어요",
    message:
      `운영자가 매각 신청을 반려했습니다.\n사유: ${parsed.data.reason}\n` +
      `내용을 보완한 뒤 다시 신청하실 수 있어요.`,
    email: true,
  });

  return NextResponse.json({ ok: true });
}
