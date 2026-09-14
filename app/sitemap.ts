import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const staticRoutes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/signup", priority: 0.8 },
    { path: "/login", priority: 0.5 },
    { path: "/impressum", priority: 0.2 },
    { path: "/datenschutz", priority: 0.2 }
  ];

  return staticRoutes.map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    priority
  }));
}
