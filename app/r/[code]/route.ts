import { NextResponse } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/referral/reward";

export const dynamic = "force-dynamic";

/**
 * 추천 링크 진입점: /r/<추천인 user_id>
 * 추천인 식별자를 쿠키에 30일 저장하고 로그인/가입 화면으로 보낸다.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const { origin } = new URL(request.url);
  const res = NextResponse.redirect(`${origin}/login?ref=1`);
  // UUID 형태만 저장 (잘못된 값 방지)
  const code = params.code;
  if (/^[0-9a-f-]{36}$/i.test(code)) {
    res.cookies.set(REFERRAL_COOKIE, code, {
      maxAge: 60 * 60 * 24 * 30, // 30일
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
