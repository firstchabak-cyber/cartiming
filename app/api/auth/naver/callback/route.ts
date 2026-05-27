import { NextResponse } from "next/server";
import { exchangeNaverCode, fetchNaverProfile } from "@/lib/auth/naver";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      `${origin}/login?error=naver_failed&reason=missing_code_or_state`,
    );
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

    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      console.error("Naver listUsers failed", listError);
      return NextResponse.redirect(
        `${origin}/login?error=naver_failed&reason=list_users`,
      );
    }
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
        return NextResponse.redirect(
          `${origin}/login?error=naver_failed&reason=create_user`,
        );
      }
    }

    // Use "recovery" link type. For users we just created with
    // email_confirm:true (always confirmed), Supabase routes
    // generateLink({type:'magiclink'}) into the recovery_token column,
    // but verifyOtp({type:'magiclink'|'email'}) reads from
    // confirmation_token — so the token is never found. Using 'recovery'
    // explicitly on both sides keeps them in the same column.
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Naver recovery link gen failed", linkError);
      return NextResponse.redirect(
        `${origin}/login?error=naver_session&reason=gen_link&msg=${encodeURIComponent(linkError?.message ?? "no_hashed_token")}`,
      );
    }

    const supabase = createClient();

    let verifyError = (
      await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "recovery",
      })
    ).error;

    if (verifyError && linkData.properties.email_otp) {
      console.warn(
        "verifyOtp(token_hash, recovery) failed, retrying with email+otp",
        verifyError.message,
      );
      verifyError = (
        await supabase.auth.verifyOtp({
          email: profile.email,
          token: linkData.properties.email_otp,
          type: "recovery",
        })
      ).error;
    }

    if (verifyError) {
      console.error("Naver verifyOtp failed", verifyError);
      return NextResponse.redirect(
        `${origin}/login?error=naver_session&reason=verify_otp&msg=${encodeURIComponent(verifyError.message)}`,
      );
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err) {
    console.error("Naver login error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      `${origin}/login?error=naver_failed&reason=exception&msg=${encodeURIComponent(msg)}`,
    );
  }
}
