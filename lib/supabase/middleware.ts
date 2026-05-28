import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth");
  const isLegalRoute =
    pathname.startsWith("/privacy") || pathname.startsWith("/terms");
  // 딜러 진입 페이지(랜딩 + 로그인 + 회원가입)는 공개
  const isDealerEntryRoute =
    pathname === "/dealer" ||
    pathname === "/dealer/login" ||
    pathname === "/dealer/signup";
  const isPublic =
    pathname === "/" || isAuthRoute || isLegalRoute || isDealerEntryRoute;
  // /admin 은 별도 layout 에서 관리자 권한 체크하므로 미들웨어는 로그인만 강제
  // /dealer/* 의 나머지 (register/listings/bids/fees) 는 페이지 자체에서 /dealer/login 으로 보냄

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // /dealer/* 의 인증 필수 페이지는 딜러 로그인으로, 그 외는 일반 로그인으로
    const isDealerProtected =
      pathname.startsWith("/dealer/") && !isDealerEntryRoute;
    url.pathname = isDealerProtected ? "/dealer/login" : "/login";
    // 원래 가려던 경로를 next 로 보존 (로그인 후 자동 복귀)
    const originalPath =
      request.nextUrl.pathname +
      (request.nextUrl.search ? request.nextUrl.search : "");
    url.search = `?next=${encodeURIComponent(originalPath)}`;
    return NextResponse.redirect(url);
  }

  // 로그인된 사용자가 로그인/회원가입 페이지로 가면 → 적절한 곳으로 보냄
  // next 파라미터가 있으면 그곳, 없으면 기본 대시보드
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    url.pathname = safeNext;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 딜러 로그인/회원가입 페이지에 이미 로그인된 사용자 → /dealer (또는 next)
  if (user && (pathname === "/dealer/login" || pathname === "/dealer/signup")) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dealer";
    url.pathname = safeNext;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
