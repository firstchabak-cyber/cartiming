"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Database,
  Wallet,
  ArrowLeft,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/sales", label: "매각 신청", icon: ShoppingBag },
  { href: "/admin/fees", label: "수수료 정산", icon: Wallet },
  { href: "/admin/dealers", label: "딜러 관리", icon: Store },
  { href: "/admin/users", label: "고객 관리", icon: Users },
  { href: "/admin/transactions", label: "실거래 데이터", icon: Database },
];

export function AdminSidebar({ email }: { email: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-2 border-r border-border bg-background p-4">
      <Link href="/dashboard" className="mb-2 flex items-center gap-2 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        앱으로 돌아가기
      </Link>
      <div className="mb-2">
        <p className="text-base font-bold text-primary">카타이밍 관리자</p>
        <p className="text-[11px] text-muted">{email}</p>
      </div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? path === "/admin"
              : path === item.href || path?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                  : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface"
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
