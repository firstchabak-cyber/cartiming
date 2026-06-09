"use client";

import { useState } from "react";
import { SocialLoginButton } from "./SocialLoginButton";
import { CarLoaderOverlay } from "@/components/ui/CarLoader";
import { createClient } from "@/lib/supabase/client";

export function SocialLoginButtons({ next }: { next?: string | null }) {
  const [pending, setPending] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    setPending("google");
    const supabase = createClient();
    const callback = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
      },
    });
  };

  const loginWithNaver = () => {
    setPending("naver");
    const url = next
      ? `/api/auth/naver/login?next=${encodeURIComponent(next)}`
      : "/api/auth/naver/login";
    window.location.href = url;
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <CarLoaderOverlay
        show={pending !== null}
        title="로그인 중…"
        messages={[
          pending === "naver"
            ? "🟢 네이버로 로그인하고 있어요"
            : "🔵 구글로 로그인하고 있어요",
          "🚗 잠시만 기다려 주세요",
        ]}
      />
      <SocialLoginButton
        provider="naver"
        onClick={loginWithNaver}
        disabled={pending !== null}
      />
      <SocialLoginButton
        provider="google"
        onClick={loginWithGoogle}
        disabled={pending !== null}
      />
    </div>
  );
}
