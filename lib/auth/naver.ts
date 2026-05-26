const NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize";
const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";

export function getNaverAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NAVER_CLIENT_ID!,
    redirect_uri: process.env.NAVER_REDIRECT_URI!,
    state,
  });
  return `${NAVER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeNaverCode(code: string, state: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.NAVER_CLIENT_ID!,
    client_secret: process.env.NAVER_CLIENT_SECRET!,
    code,
    state,
  });

  const res = await fetch(`${NAVER_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("네이버 토큰 교환 실패");
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: string;
  };
}

export async function fetchNaverProfile(accessToken: string) {
  const res = await fetch(NAVER_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("네이버 프로필 조회 실패");
  const data = await res.json();
  return data.response as {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
}
