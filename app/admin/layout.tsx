import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isAdmin(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-background p-6 text-center">
          <p className="text-3xl">🚫</p>
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            접근 권한이 없습니다
          </h1>
          <p className="mt-1 text-sm text-muted">
            운영자 전용 페이지입니다.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            대시보드로
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-x-auto p-4 md:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
