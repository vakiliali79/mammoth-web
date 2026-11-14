import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const entry = (path: string, enPath: string, priority: number) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
    alternates: { languages: { fa: `${base}${path}`, en: `${base}${enPath}` } },
  });
  return [
    entry("/", "/en", 1),
    entry("/menu", "/en/menu", 0.9),
    { ...entry("/en", "/en", 0.7), alternates: { languages: { fa: `${base}/`, en: `${base}/en` } } },
    { ...entry("/en/menu", "/en/menu", 0.6), alternates: { languages: { fa: `${base}/menu`, en: `${base}/en/menu` } } },
  ];
}
