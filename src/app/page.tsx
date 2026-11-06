import type { Metadata } from "next";
import Link from "next/link";
import Cover from "@/components/Cover";
import FolgenKarte from "@/components/FolgenKarte";
import { PfeilRechts, PlayIcon } from "@/components/Icons";
import PlattformLogo from "@/components/PlattformLogo";
import { datumLang, dauerGesprochen, dauerText, folgen } from "@/lib/folgen";
import { plattformen, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  alternates: { canonical: "/" },
};

// Text unter dem Titel wörtlich wie auf der Live-Seite (Zeilenumbrüche inklusive).
const heroZeilen = [
  siteConfig.tagline,
  "Kennst du diesen Gedanken: Irgendwann mache ich das auch mal?",
  "Irgendwann reisen.",
  "Irgendwann auswandern.",
  "Irgendwann etwas Neues anfangen.",
  "…",
];

export default function Startseite() {
  const [frisch] = folgen;
  const neueste = folgen.slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-10 pb-20 text-center sm:pt-16 lg:pb-28">
        <p className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">{siteConfig.moderation}</p>
        <h1 className="text-4xl leading-none font-bold tracking-tight text-balance lg:text-6xl lg:tracking-[-1.5px]">{siteConfig.name}</h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          {heroZeilen.map((z, i) => (
            <span key={i}>
              {z}
              {i < heroZeilen.length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="mt-10">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Anhören auf</p>
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {plattformen.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener" aria-label={p.name} title={p.name} className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 transition hover:-translate-y-0.5 hover:shadow-sm">
                  <PlattformLogo p={p} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Neueste Folge (bewusste Abweichung von PodView: dort „Frische Folge") */}
      {frisch && (
        <section aria-labelledby="frisch-titel" className="schein relative overflow-hidden px-4 py-16 sm:px-6 lg:py-20">
          <p className="mb-10 flex items-center justify-center gap-4 text-sm font-medium tracking-widest text-primary-text uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary/70" />
            Neueste Folge
            <span aria-hidden="true" className="h-px w-8 bg-primary/70" />
          </p>
          <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-8">
            <div className="grid items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
              <Cover groesse={420} sizes="(min-width: 1280px) 420px, (min-width: 768px) 40vw, 92vw" className="w-full rounded-xl shadow-md" priority />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary-text">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                  Neu
                </span>
                <h2 id="frisch-titel" className="mt-4 text-2xl font-bold text-balance [overflow-wrap:anywhere] md:text-3xl">
                  <Link href={`/episodes/${frisch.slug}/`} className="hover:underline">
                    {frisch.titel}
                  </Link>
                </h2>
                <p className="mt-4 text-sm text-muted">
                  <time dateTime={frisch.datum}>{datumLang(frisch.datum)}</time>
                  {frisch.dauer != null && (
                    <>
                      <span aria-hidden="true" className="mx-3">•</span>
                      <span aria-hidden="true">{dauerText(frisch.dauer)}</span>
                      <span className="sr-only">, Dauer {dauerGesprochen(frisch.dauer)}</span>
                    </>
                  )}
                </p>
                <p className="mt-6 line-clamp-3 leading-relaxed text-muted">{frisch.beschreibung}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Link href={`/episodes/${frisch.slug}/`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-text shadow-sm transition hover:shadow-md hover:brightness-105">
                    <PlayIcon />
                    Jetzt anhören
                  </Link>
                  <Link href="/episodes/" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
                    Alle Folgen ansehen
                    <PfeilRechts />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Weitere Folgen (Liste unter der neuesten Folge; bewusste Abweichung von PodView: dort „Neueste Folgen") */}
      <section aria-labelledby="neueste-titel" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 id="neueste-titel" className="text-2xl font-bold">
            Weitere Folgen
          </h2>
          <Link href="/episodes/" className="inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline">
            Alle ansehen <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </div>
        <ul className="space-y-4">
          {neueste.map((f) => (
            <li key={f.slug}>
              <FolgenKarte folge={f} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
