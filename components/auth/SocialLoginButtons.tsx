"use client";

import { useState } from "react";
import { SocialLoginButton } from "./SocialLoginButton";
import { createClient } from "@/lib/supabase/client";

export function SocialLoginButtons() {
  const [pending, setPending] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    setPending("google");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const loginWithNaver = () => {
    setPending("naver");
    window.location.href = "/api/auth/naver/login";
  };

  return (
    <div className="flex w-full flex-col gap-3">
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
