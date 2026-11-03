import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogBild from "@/components/BlogBild";
import EntwurfHinweis from "@/components/EntwurfHinweis";
import { ChevronLinks } from "@/components/Icons";
import ZurFolge from "@/components/ZurFolge";
import { artikel, datumLesbar } from "@/lib/blog";
import { folgeNachSlug } from "@/lib/folgen";
import { absolut, breadcrumb, JsonLd, serieId } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

// Static Export verlangt mindestens einen Parameter. Solange es keine Artikel
// gibt, wird deshalb nur ein Platzhalter erzeugt, den scripts/nach-dem-build.mjs
// wieder aus dem Export löscht (er wird nirgends verlinkt).
const PLATZHALTER = "_noch-keine-artikel";

export function generateStaticParams() {
  return artikel.length ? artikel.map((a) => ({ slug: a.slug })) : [{ slug: PLATZHALTER }];
}
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = artikel.find((x) => x.slug === slug);
  if (!a) return { title: "Blog" };
  const pfad = `/blog/${a.slug}/`;
  const bild = a.erstesBild ? [{ url: a.erstesBild.src, width: a.erstesBild.width, height: a.erstesBild.height, alt: a.erstesBild.alt }] : undefined;
  return {
    title: a.titel,
    description: a.beschreibung,
    alternates: { canonical: pfad },
    openGraph: { type: "article", url: pfad, title: a.titel, description: a.beschreibung, publishedTime: a.datum, authors: [siteConfig.verantwortlich.name], images: bild },
    twitter: { card: "summary_large_image", title: a.titel, description: a.beschreibung, images: bild?.map((b) => b.url) },
  };
}

export default async function BlogArtikel({ params }: Props) {
  const { slug } = await params;
  const a = artikel.find((x) => x.slug === slug);
  if (!a) notFound();
  const pfad = `/blog/${a.slug}/`;
  const folge = a.folgeSlug ? folgeNachSlug(a.folgeSlug) : null;
  if (a.folgeSlug && !folge) throw new Error(`Blogartikel ${a.slug}: folge-slug "${a.folgeSlug}" gibt es nicht in content/folgen.json.`);

  const jsonLd = {
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${absolut(pfad)}#artikel`,
        headline: a.titel,
        description: a.beschreibung,
        datePublished: a.datum,
        url: absolut(pfad),
        mainEntityOfPage: absolut(pfad),
        inLanguage: siteConfig.sprache,
        author: { "@type": "Person", name: siteConfig.verantwortlich.name },
        ...(a.erstesBild ? { image: absolut(a.erstesBild.src) } : {}),
        isPartOf: { "@type": "Blog", "@id": `${absolut("/blog/")}#blog`, name: `Blog – ${siteConfig.name}`, url: absolut("/blog/") },
        ...(folge
          ? {
              about: {
                "@type": "PodcastEpisode",
                "@id": `${absolut(`/episodes/${folge.slug}/`)}#folge`,
                name: folge.titel,
                url: absolut(`/episodes/${folge.slug}/`),
                partOfSeries: { "@id": serieId },
              },
            }
          : {}),
      },
      breadcrumb([
        { name: "Blog", pfad: "/blog/" },
        { name: a.titel, pfad },
      ]),
    ],
  };

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <JsonLd daten={jsonLd} />
      <article className="mx-auto max-w-[36.5rem] text-[18px]">
        <Link href="/blog/" className="group inline-flex min-h-11 items-center gap-3 text-muted transition hover:text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-text transition group-hover:bg-primary/25">
            <ChevronLinks />
          </span>
          <span className="font-medium">Alle Artikel</span>
        </Link>

        {a.entwurf && <EntwurfHinweis>Entwurf – nur in der Vorschau sichtbar, live noch nicht veröffentlicht.</EntwurfHinweis>}

        <header className="mt-6">
          <p className="text-sm text-muted">
            <time dateTime={a.datum}>{datumLesbar(a.datum)}</time>
            <span aria-hidden="true"> · </span>
            {siteConfig.moderation}
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-bold text-balance sm:text-4xl">{a.titel}</h1>
          <p className="mt-5 text-xl leading-relaxed text-muted">{a.beschreibung}</p>
        </header>

        <div className="artikel mt-10">
          {a.bloecke.map((b, i) => (b.art === "bild" ? <BlogBild key={i} bild={b} /> : <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />))}
        </div>

        {folge && <ZurFolge folge={folge} />}
      </article>
    </div>
  );
}
