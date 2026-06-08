"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=1", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data?.unreadCount ?? 0);
    } catch {
      // ignore - 비로그인 등
    }
  }, []);

  // 페이지 이동 때마다 + 알림 읽음 이벤트가 오면 즉시 배지 갱신
  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener("notifications:changed", onChanged);

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();

    return () => {
      window.removeEventListener("notifications:changed", onChanged);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <Link
      href="/notifications"
      aria-label={`알림 ${unread}건`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-surface"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
