import Link from "next/link";
import Cover from "@/components/Cover";
import FolgenKarte from "@/components/FolgenKarte";
import { PfeilRechts, PlayIcon } from "@/components/Icons";
import { datumLang, dauerGesprochen, dauerText, folgen } from "@/lib/folgen";

// Alles unter dem Hero der Startseite: „Neueste Folge“ und „Weitere Folgen“.
// Eigene Komponente, damit Entwürfe der Startseite (nur Vorschau, siehe
// src/app/entwurf/) genau denselben unteren Teil zeigen.
export default function StartseiteFolgen() {
  const [frisch] = folgen;
  const neueste = folgen.slice(0, 5);

  return (
    <>
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
                  <Link href={`/episodes/${frisch.slug}/`} className="kipp kipp-dezent inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-text hover:brightness-105">
                    <PlayIcon />
                    Jetzt anhören
                  </Link>
                  <Link href="/episodes/" className="kipp kipp-dezent inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-5 font-medium">
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
          <Link href="/episodes/" className="kipp kipp-dezent inline-flex min-h-11 items-center rounded-full border border-border/70 bg-surface/80 px-4 text-sm font-medium text-primary-text">
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
