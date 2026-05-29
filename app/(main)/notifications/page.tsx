import Link from "next/link";
import { BellOff, Bell, TrendingUp } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarkAllReadButton } from "@/components/layout/MarkAllReadButton";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";

const TYPE_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  sell_now: { label: "매각 적기", tone: "success" },
  price_drop: { label: "시세 하락", tone: "danger" },
  price_rise: { label: "시세 상승", tone: "warning" },
  system: { label: "공지", tone: "neutral" },
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = user
    ? await supabase
        .from("notifications")
        .select(
          "id, vehicle_id, type, title, message, read_at, created_at, vehicles(plate_number)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: null };

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => n.read_at === null).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">알림</h1>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      <NotificationSettings />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <BellOff className="h-10 w-10 text-muted" />
          <CardTitle>알림이 없습니다</CardTitle>
          <CardDescription>
            차량 시세 분석을 실행하면 매각 적기 알림이 도착해요.
          </CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            const Icon = n.type === "sell_now" ? TrendingUp : Bell;
            const href = n.vehicle_id
              ? `/analysis?vehicleId=${n.vehicle_id}`
              : "/dashboard";
            const unread = n.read_at === null;
            return (
              <li key={n.id}>
                <Link href={href}>
                  <Card
                    className={
                      unread
                        ? "border-primary/40 bg-primary/5"
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="flex-1">
                        {(() => {
                          const plate = (
                            n as unknown as {
                              vehicles?: { plate_number?: string | null } | null;
                            }
                          ).vehicles?.plate_number;
                          if (plate) {
                            return (
                              <span className="mb-1 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                                {plate}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{n.title}</CardTitle>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {n.message}
                        </CardDescription>
                        <p className="mt-2 text-xs text-muted">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
