import type { Metadata, Viewport } from "next";
import { APP_URL } from "@/lib/constants/app";
import "./globals.css";

const TITLE = "카타임 | 내 차의 적정 매각 시점";
const DESCRIPTION = "AI가 분석하는 내 차의 현재·미래 시세와 매각 적기 알림 서비스";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "카타임",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "카타임",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // 카카오톡·문자·SNS 링크 공유 시 미리보기
  openGraph: {
    type: "website",
    siteName: "카타임",
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    locale: "ko_KR",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "카타임" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
