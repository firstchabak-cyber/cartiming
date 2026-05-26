import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getNaverAuthUrl } from "@/lib/auth/naver";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const url = getNaverAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("naver_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
