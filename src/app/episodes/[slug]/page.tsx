import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import GelberButton from "@/components/GelberButton";
import { Artikel, ChevronLinks, ChevronRechts, Kalender, Notizen, Uhr } from "@/components/Icons";
import PlattformLogo from "@/components/PlattformLogo";
import Player from "@/components/Player";
import TeilenKnopf from "@/components/TeilenKnopf";
import { artikelZurFolge } from "@/lib/blog";
import { datumKurz, dauerGesprochen, dauerIso, dauerText, folgeNachSlug, folgen, nachbarn } from "@/lib/folgen";
import { absolut, breadcrumb, JsonLd, serieId } from "@/lib/seo";
import { plattformen, siteConfig } from "@/lib/site-config";

export function generateStaticParams() {
  return folgen.map((f) => ({ slug: f.slug }));
}
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const folge = folgeNachSlug((await params).slug);
  if (!folge) return {};
  const pfad = `/episodes/${folge.slug}/`;
  return {
    title: folge.titel,
    description: folge.beschreibung.slice(0, 160),
    alternates: { canonical: pfad },
    openGraph: {
      type: "article",
      url: pfad,
      title: folge.titel,
      description: folge.beschreibung.slice(0, 200),
      publishedTime: folge.datum,
      images: [{ url: "/images/og-cover.jpg", width: 1200, height: 1200 }],
      audio: folge.mp3 ? [{ url: folge.mp3, type: folge.mp3Typ }] : undefined,
    },
  };
}

export default async function FolgenSeite({ params }: Props) {
  const folge = folgeNachSlug((await params).slug);
  if (!folge) notFound();
  const pfad = `/episodes/${folge.slug}/`;
  const { aelter, neuer } = nachbarn(folge.slug);
  const artikel = artikelZurFolge(folge.slug);

  const jsonLd = {
    "@graph": [
      {
        "@type": "PodcastEpisode",
        "@id": `${absolut(pfad)}#folge`,
        url: absolut(pfad),
        name: folge.titel,
        datePublished: folge.datum,
        description: folge.beschreibung,
        timeRequired: dauerIso(folge.dauer),
        image: absolut("/images/og-cover.jpg"),
        inLanguage: siteConfig.sprache,
        ...(folge.nummer ? { episodeNumber: folge.nummer } : {}),
        partOfSeries: { "@type": "PodcastSeries", "@id": serieId, name: siteConfig.name, url: absolut("/") },
        ...(folge.mp3
          ? { associatedMedia: { "@type": "MediaObject", contentUrl: folge.mp3, encodingFormat: folge.mp3Typ, duration: dauerIso(folge.dauer) } }
          : {}),
      },
      breadcrumb([
        { name: "Folgen", pfad: "/episodes/" },
        { name: folge.titel, pfad },
      ]),
    ],
  };

  return (
    <div className="schein">
      <JsonLd daten={jsonLd} />
      <div className="mx-auto max-w-[52rem] px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <Link href="/episodes/" className="kipp kipp-dezent group inline-flex min-h-11 items-center gap-3 rounded-full border border-border/70 bg-surface/80 py-1 pr-5 pl-1.5 text-muted hover:text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-text transition group-hover:bg-primary/25">
            <ChevronLinks />
          </span>
          <span className="font-medium">Zurück zu allen Folgen</span>
        </Link>

        <article className="mt-6 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-10">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="shrink-0 self-center rounded-2xl border border-border/80 p-3 sm:self-start sm:p-4">
              <Cover groesse={224} sizes="224px" className="h-48 w-48 rounded-xl shadow-lg sm:h-56 sm:w-56" priority />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-sm text-primary-text">
                  <Kalender />
                  <time dateTime={folge.datum}>{datumKurz(folge.datum)}</time>
                </span>
                {folge.dauer != null && (
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary/15 px-3 text-sm text-secondary-text">
                    <Uhr />
                    <span aria-hidden="true">{dauerText(folge.dauer)}</span>
                    <span className="sr-only">Dauer {dauerGesprochen(folge.dauer)}</span>
                  </span>
                )}
                <TeilenKnopf titel={folge.titel} url={absolut(pfad)} />
              </div>
              <h1 className="mt-4 text-2xl leading-tight font-bold text-balance [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">{folge.titel}</h1>
              {/* Blogartikel möglichst weit oben, vor dem Player. Live gibt es nur
                  veröffentlichte Artikel (Entwürfe liest src/lib/blog.ts dort gar nicht). */}
              {artikel && (
                <GelberButton href={`/blog/${artikel.slug}/`} icon={<Artikel className="h-5 w-5" />} className="mt-5">
                  Zum Blogartikel
                </GelberButton>
              )}
            </div>
          </header>

          {folge.mp3 && (
            <div className="mt-8">
              <Player src={folge.mp3} titel={folge.titel} dauer={folge.dauer} />
            </div>
          )}


          <section aria-labelledby="ueber-folge" className="mt-10">
            <h2 id="ueber-folge" className="mb-4 inline-flex items-center gap-2 text-xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-text">
                <Notizen />
              </span>
              Über diese Folge
            </h2>
            <div className="prosa leading-relaxed [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: folge.shownotes }} />
          </section>

          <section aria-labelledby="anhoeren-auf" className="mt-10 border-t border-border pt-8">
            <h2 id="anhoeren-auf" className="text-xl font-semibold">
              Anhören auf
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {plattformen.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener" className="kipp kipp-dezent inline-flex min-h-11 items-center gap-2 rounded-lg bg-border/70 px-4 hover:bg-border">
                    <PlattformLogo p={p} groesse={18} />
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </article>

        {(neuer || aelter) && (
          <nav aria-label="Weitere Folgen" className="mt-8 grid gap-4 sm:grid-cols-2">
            {neuer ? (
              <Link href={`/episodes/${neuer.slug}/`} rel="prev" className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:shadow-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-text">
                  <ChevronLinks />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted">Zurück</span>
                  <span className="block font-semibold [overflow-wrap:anywhere]">{neuer.titel}</span>
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {aelter && (
              <Link href={`/episodes/${aelter.slug}/`} rel="next" className="group flex items-center justify-end gap-4 rounded-2xl border border-border bg-surface p-5 text-right transition hover:shadow-md">
                <span className="min-w-0">
                  <span className="block text-sm text-muted">Weiter</span>
                  <span className="block font-semibold [overflow-wrap:anywhere]">{aelter.titel}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-text">
                  <ChevronRechts />
                </span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
