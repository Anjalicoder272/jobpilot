import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/experiences`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE.url}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
