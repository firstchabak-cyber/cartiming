"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Car, Search, LineChart, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/garage", label: "내 차고", icon: Car },
  { href: "/wanted", label: "찾는차", icon: Search },
  { href: "/analysis", label: "분석", icon: LineChart },
  { href: "/profile", label: "마이", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-background">
      <ul className="mx-auto flex h-16 w-full max-w-mobile">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
