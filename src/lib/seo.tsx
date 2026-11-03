import { siteConfig } from "@/lib/site-config";

export const absolut = (pfad: string) => `${siteConfig.url}${pfad}`;

export const serieId = `${siteConfig.url}/#podcast`;

// Unsichtbares BreadcrumbList-Schema (kein sichtbarer Brotkrumenpfad, wie im Original).
export function breadcrumb(stufen: { name: string; pfad: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Start", pfad: "/" }, ...stufen].map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      item: absolut(s.pfad),
    })),
  };
}

export function JsonLd({ daten }: { daten: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...daten }).replace(/</g, "\\u003c") }}
    />
  );
}
