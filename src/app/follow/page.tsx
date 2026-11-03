import type { Metadata } from "next";
import Cover from "@/components/Cover";
import { Extern, Rss } from "@/components/Icons";
import PlattformLogo from "@/components/PlattformLogo";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { plattformen, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Abonnieren",
  description: `${siteConfig.name} abonnieren – auf Spotify, Apple Podcasts und YouTube oder per RSS-Feed in jeder anderen Podcast-App.`,
  alternates: { canonical: "/follow/" },
};

export default function Abonnieren() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Abonnieren", pfad: "/follow/" }])] }} />
      <section className="rounded-lg border border-border bg-surface p-6 text-center shadow-xs sm:p-8">
        <Cover groesse={128} sizes="128px" className="mx-auto h-32 w-32 rounded-xl shadow-md" priority />
        <h1 className="mt-6 text-2xl leading-tight font-bold text-balance sm:text-3xl">{siteConfig.name} folgen</h1>
        <p className="mt-2 text-muted">Abonniere, um keine Folge zu verpassen</p>
        <ul className="mt-8 space-y-3 text-left">
          {plattformen.map((p) => (
            <li key={p.id}>
              <a href={p.url} target="_blank" rel="noopener" className="flex min-h-16 items-center gap-4 rounded-lg border border-border bg-bg px-6 text-lg font-medium transition hover:-translate-y-0.5 hover:shadow-md">
                <PlattformLogo p={p} groesse={32} className="rounded-lg" />
                <span className="flex-1">{p.name}</span>
                <Extern className="h-5 w-5 text-muted" />
                <span className="sr-only">(öffnet in neuem Tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-sm text-muted">Oder per RSS-Feed in jeder anderen Podcast-App abonnieren</p>
          <a href={siteConfig.feed} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary/15 px-4 text-secondary-text transition hover:bg-secondary/25">
            <Rss className="h-5 w-5" />
            RSS-Feed
          </a>
        </div>
      </section>
    </div>
  );
}
