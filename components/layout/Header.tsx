"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { CreditsBadge } from "./CreditsBadge";
import { APP_NAME } from "@/lib/constants/app";

type HeaderProps = {
  title?: string;
  back?: boolean;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-mobile items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          {title ?? APP_NAME}
        </Link>
        <div className="flex items-center gap-2">
          <CreditsBadge />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
