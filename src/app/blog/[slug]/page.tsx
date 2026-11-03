import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Textseite from "@/components/Textseite";
import { artikel } from "@/lib/blog";
import { folgeNachSlug } from "@/lib/folgen";
import { absolut, breadcrumb, JsonLd } from "@/lib/seo";
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
  return {
    title: a.titel,
    description: a.beschreibung,
    alternates: { canonical: pfad },
    openGraph: { type: "article", url: pfad, title: a.titel, description: a.beschreibung, publishedTime: a.datum },
  };
}

export default async function BlogArtikel({ params }: Props) {
  const { slug } = await params;
  const a = artikel.find((x) => x.slug === slug);
  if (!a) notFound();
  const pfad = `/blog/${a.slug}/`;
  const folge = a.folgeSlug ? folgeNachSlug(a.folgeSlug) : null;
  return (
    <Textseite>
      <JsonLd
        daten={{
          "@graph": [
            {
              "@type": "BlogPosting",
              headline: a.titel,
              description: a.beschreibung,
              datePublished: a.datum,
              url: absolut(pfad),
              inLanguage: siteConfig.sprache,
              author: { "@type": "Person", name: siteConfig.moderation },
              ...(folge ? { about: { "@id": `${absolut(`/episodes/${folge.slug}/`)}#folge` } } : {}),
            },
            breadcrumb([
              { name: "Blog", pfad: "/blog/" },
              { name: a.titel, pfad },
            ]),
          ],
        }}
      />
      <p className="!mb-2 text-sm text-muted">
        <time dateTime={a.datum}>{new Date(a.datum).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</time>
      </p>
      <h1>{a.titel}</h1>
      {folge && (
        <p>
          Zur Folge: <Link href={`/episodes/${folge.slug}/`}>{folge.titel}</Link>
        </p>
      )}
      <div dangerouslySetInnerHTML={{ __html: a.html }} />
    </Textseite>
  );
}
