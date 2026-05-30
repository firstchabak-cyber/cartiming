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
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const storedState = cookies
    .find((c) => c.startsWith("naver_oauth_state="))
    ?.split("=")[1];

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/login?error=naver_state`);
  }

  const nextRaw = cookies
    .find((c) => c.startsWith("naver_oauth_next="))
    ?.split("=")[1];
  const next = nextRaw ? decodeURIComponent(nextRaw) : null;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  try {
    const token = await exchangeNaverCode(code, state);
    const profile = await fetchNaverProfile(token.access_token);

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=naver_no_email`);
    }

    const password = derivePassword(profile.id);
    const admin = createAdminClient();

    // 이메일로 후보 사용자 id 조회 — 전체 listUsers 스캔 대신 profiles 테이블 사용
    // (가입 시 트리거로 profiles 자동 생성됨. 회원 수와 무관하게 즉시 조회)
    type AuthUserLite = {
      id: string;
      email?: string | null;
      deleted_at?: string | null;
    };

    const { data: candidates } = await admin
      .from("profiles")
      .select("id")
      .eq("email", profile.email);
    const candidateIds = (candidates ?? []).map((c: { id: string }) => c.id);

    // 각 후보를 getUserById 로 확인해 활성/소프트삭제 구분
    let existing: AuthUserLite | undefined;
    const softDeleted: AuthUserLite[] = [];
    for (const id of candidateIds) {
      const { data: got } = await admin.auth.admin.getUserById(id);
      const u = got?.user as AuthUserLite | undefined;
      if (!u) continue;
      if (u.deleted_at) softDeleted.push(u);
      else if (!existing) existing = u;
    }

    for (const stale of softDeleted) {
      const { error: purgeError } = await admin.auth.admin.deleteUser(
        stale.id,
        false,
      );
      if (purgeError) {
        console.error("Naver purge soft-deleted user failed", purgeError);
        return NextResponse.redirect(
          `${origin}/login?error=naver_failed&reason=purge_user&msg=${encodeURIComponent(purgeError.message)}`,
        );
      }
    }

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
        const looksMissing = /not\s*found/i.test(updateError.message);
        if (!looksMissing) {
          console.error("Naver user update failed", updateError);
          return NextResponse.redirect(
            `${origin}/login?error=naver_failed&reason=update_user&msg=${encodeURIComponent(updateError.message)}`,
          );
        }
        console.warn(
          "Naver update returned not-found despite listUsers; purging and recreating",
          existing.id,
        );
        await admin.auth.admin
          .deleteUser(existing.id, false)
          .catch((e: unknown) =>
            console.warn("phantom purge failed (ignored)", e),
          );
        const { error: recreateError } = await admin.auth.admin.createUser({
          email: profile.email,
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        });
        if (recreateError) {
          console.error("Naver user recreate failed", recreateError);
          return NextResponse.redirect(
            `${origin}/login?error=naver_failed&reason=recreate_user&msg=${encodeURIComponent(recreateError.message)}`,
          );
        }
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

    const redirectRes = NextResponse.redirect(`${origin}${safeNext}`);
    redirectRes.cookies.delete("naver_oauth_next");
    return redirectRes;
  } catch (err) {
    console.error("Naver login error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      `${origin}/login?error=naver_failed&reason=exception&msg=${encodeURIComponent(msg)}`,
    );
  }
}
