import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { exchangeNaverCode, fetchNaverProfile } from "@/lib/auth/naver";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function derivePassword(naverId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256")
    .update(`naver:${naverId}:${secret}`)
    .digest("hex");
}

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

    const password = derivePassword(profile.id);
    const admin = createAdminClient();

    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      console.error("Naver listUsers failed", listError);
      return NextResponse.redirect(
        `${origin}/login?error=naver_failed&reason=list_users&msg=${encodeURIComponent(listError.message)}`,
      );
    }
    const existing = list?.users?.find(
      (u: { email?: string | null }) => u.email === profile.email,
    );

    const userMetadata = {
      name: profile.name ?? profile.nickname,
      avatar_url: profile.profile_image,
      provider: "naver",
      naver_id: profile.id,
    };

    if (!existing) {
      const { error: createError } = await admin.auth.admin.createUser({
        email: profile.email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (createError) {
        console.error("Naver user create failed", createError);
        return NextResponse.redirect(
          `${origin}/login?error=naver_failed&reason=create_user&msg=${encodeURIComponent(createError.message)}`,
        );
      }
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        existing.id,
        {
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        },
      );
      if (updateError) {
        console.error("Naver user update failed", updateError);
        return NextResponse.redirect(
          `${origin}/login?error=naver_failed&reason=update_user&msg=${encodeURIComponent(updateError.message)}`,
        );
      }
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError) {
      console.error("Naver signInWithPassword failed", signInError);
      return NextResponse.redirect(
        `${origin}/login?error=naver_session&reason=sign_in&msg=${encodeURIComponent(signInError.message)}`,
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
