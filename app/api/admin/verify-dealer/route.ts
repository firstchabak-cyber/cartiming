import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { createAndDispatch } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({ dealerId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "dealerId 필요" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("dealers")
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq("user_id", parsed.data.dealerId);
  if (error) {
    return NextResponse.json(
      { error: "승인 실패", detail: error.message },
      { status: 500 },
    );
  }

  // 딜러에게 인증 완료 알림 — 이제 입찰 가능
  await createAndDispatch(admin, {
    userId: parsed.data.dealerId,
    type: "system",
    title: "✅ 딜러 인증이 완료됐어요",
    message:
      "사업자 인증이 완료되어 이제 매물에 입찰할 수 있습니다.\n매물 리스트에서 차량을 확인하고 입찰해 보세요.",
    email: true,
  });

  return NextResponse.json({ ok: true });
}
