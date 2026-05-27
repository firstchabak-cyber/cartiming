import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth exchange failed", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_session`);
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
