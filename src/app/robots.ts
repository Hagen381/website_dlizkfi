import type { MetadataRoute } from "next";
import { istVorschau } from "@/lib/base-path";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // GitHub-Pages-Vorschau: komplett gesperrt (doppelter Inhalt).
  if (istVorschau) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
