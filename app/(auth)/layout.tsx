import { BusinessFooter } from "@/components/layout/BusinessFooter";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <BusinessFooter />
    </div>
  );
}
