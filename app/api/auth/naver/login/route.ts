import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getNaverAuthUrl } from "@/lib/auth/naver";

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
  return res;
}
