"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Provider = "naver" | "google";

type SocialLoginButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  provider: Provider;
};

const STYLES: Record<Provider, string> = {
  naver: "bg-naver text-naver-foreground hover:opacity-90",
  google:
    "bg-google text-google-foreground border border-border hover:bg-surface",
};

const LABELS: Record<Provider, string> = {
  naver: "네이버로 시작하기",
  google: "구글로 시작하기",
};

const ICONS: Record<Provider, string> = {
  naver: "💚",
  google: "G",
};

export function SocialLoginButton({
  provider,
  className,
  children,
  ...props
}: SocialLoginButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-opacity",
        STYLES[provider],
        className,
      )}
      {...props}
    >
      <span className="text-lg leading-none" aria-hidden>
        {ICONS[provider]}
      </span>
      <span>{children ?? LABELS[provider]}</span>
    </button>
  );
}
