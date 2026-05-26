import { NextResponse } from "next/server";
import { exchangeNaverCode, fetchNaverProfile } from "@/lib/auth/naver";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${origin}/login?error=naver_failed`);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const storedState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("naver_oauth_state="))
    ?.split("=")[1];

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/login?error=naver_state`);
  }

  try {
    const token = await exchangeNaverCode(code, state);
    const profile = await fetchNaverProfile(token.access_token);

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=naver_no_email`);
    }

    const admin = createAdminClient();

    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find(
      (u: { email?: string | null }) => u.email === profile.email,
    );

    if (!existing) {
      const { error: createError } = await admin.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: {
          name: profile.name ?? profile.nickname,
          avatar_url: profile.profile_image,
          provider: "naver",
          naver_id: profile.id,
        },
      });
      if (createError) {
        console.error("Naver user create failed", createError);
        return NextResponse.redirect(`${origin}/login?error=naver_failed`);
      }
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Naver magic link gen failed", linkError);
      return NextResponse.redirect(`${origin}/login?error=naver_session`);
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("Naver verifyOtp failed", verifyError);
      return NextResponse.redirect(`${origin}/login?error=naver_session`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err) {
    console.error("Naver login error", err);
    return NextResponse.redirect(`${origin}/login?error=naver_failed`);
  }
}
