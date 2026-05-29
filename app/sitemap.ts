import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants/app";

export default function sitemap(): MetadataRoute.Sitemap {
  // 검색엔진에 노출할 공개 페이지만
  const routes = ["", "/login", "/signup", "/dealer", "/terms", "/privacy"];
  return routes.map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
