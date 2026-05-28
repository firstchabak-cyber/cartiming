import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { BusinessFooter } from "@/components/layout/BusinessFooter";

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
      </main>
      <BusinessFooter />
      <BottomNav />
    </div>
  );
}
