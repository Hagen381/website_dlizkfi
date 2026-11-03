import type { MetadataRoute } from "next";
import { siteConfig, sitePages } from "@/lib/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitePages.map((page) => ({
    url: `${siteConfig.url}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
