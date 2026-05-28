import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getNaverAuthUrl } from "@/lib/auth/naver";

export const dynamic = "force-dynamic";

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = isSafeNext(searchParams.get("next"));
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
  if (next) {
    res.cookies.set("naver_oauth_next", next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });
  }
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
