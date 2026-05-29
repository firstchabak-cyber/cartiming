import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants/app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 로그인 후에만 의미 있는 경로 + 관리자/딜러/결제는 색인 제외
      disallow: ["/admin", "/dealer", "/api", "/payment", "/garage", "/profile"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
