import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-mobile flex-1 px-4 py-4">
        {children}
        <footer className="mt-8 flex justify-center gap-3 text-[11px] text-muted">
          <Link href="/terms" className="hover:text-foreground hover:underline">
            이용약관
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            개인정보처리방침
          </Link>
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
