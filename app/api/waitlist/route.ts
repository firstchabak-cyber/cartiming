import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
  // 어느 랜딩/캠페인에서 왔는지 (기본 welcome)
  source: z.string().trim().max(50).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "올바른 이메일을 입력해주세요" },
      { status: 400 },
    );
  }

  // 비로그인 방문자가 남기는 이메일이라 RLS를 우회하는 admin 클라이언트로 저장한다.
  const admin = createAdminClient();
  const { error } = await admin.from("waitlist").upsert(
    {
      email: parsed.data.email,
      source: parsed.data.source ?? "welcome",
      // 어디서 들어온 방문인지 흔적 (있으면)
      referrer: request.headers.get("referer") ?? null,
    },
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요" },
      { status: 500 },
    );
  }

  // 이미 등록된 이메일이어도 사용자에겐 성공으로 보여준다 (중복 안내로 불쾌감 주지 않기).
  return NextResponse.json({ ok: true });
}
