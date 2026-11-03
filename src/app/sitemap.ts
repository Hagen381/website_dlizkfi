import type { MetadataRoute } from "next";
import { artikel, hatBlog } from "@/lib/blog";
import { folgen, seitenAnzahl, seitenPfad } from "@/lib/folgen";
import { siteConfig, sitePages } from "@/lib/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const neueste = folgen[0]?.datum;
  const url = (pfad: string) => `${siteConfig.url}${pfad}`;
  return [
    ...sitePages.map((p) => ({
      url: url(p.path),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      ...(p.path === "/" || p.path === "/episodes/" ? { lastModified: neueste } : {}),
    })),
    ...Array.from({ length: seitenAnzahl - 1 }, (_, i) => ({ url: url(seitenPfad(i + 2)), changeFrequency: "weekly" as const, priority: 0.4 })),
    ...folgen.map((f) => ({ url: url(`/episodes/${f.slug}/`), lastModified: f.datum, changeFrequency: "monthly" as const, priority: 0.8 })),
    // Blog erst, wenn es Artikel gibt
    ...(hatBlog
      ? [
          { url: url("/blog/"), changeFrequency: "weekly" as const, priority: 0.6 },
          ...artikel.map((a) => ({ url: url(`/blog/${a.slug}/`), lastModified: a.datum, changeFrequency: "monthly" as const, priority: 0.7 })),
        ]
      : []),
  ];
}
