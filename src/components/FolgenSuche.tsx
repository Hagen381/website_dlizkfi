"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import ArtikelTrefferKarte, { type TrefferArtikel } from "@/components/ArtikelTrefferKarte";
import FolgenKarte, { type KartenFolge } from "@/components/FolgenKarte";
import { Lupe } from "@/components/Icons";
import { mitBasePath } from "@/lib/base-path";
import { suchen as suche } from "@/lib/suche";

type Eintrag = ({ art: "folge" } & KartenFolge) | ({ art: "artikel" } & TrefferArtikel);
type IndexEintrag = Eintrag & { themen: string[]; text: string };

// Suche im Browser über den Index /suche.json (Folgen + Blogartikel, siehe
// src/app/suche.json/route.ts; Suchlogik src/lib/suche.ts).
// Ohne Suchbegriff wird die normale, statisch erzeugte Liste (children) gezeigt.
// Die Adresse /episodes/?q=… funktioniert auch als Link.
// kopfClassName: Layout von Titel + Suchfeld (Standard wie auf /episodes/).
export default function FolgenSuche({ titel, children, kopfClassName = "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" }: { titel: ReactNode; children: ReactNode; kopfClassName?: string }) {
  const [eingabe, setEingabe] = useState("");
  const [begriff, setBegriff] = useState("");
  const [index, setIndex] = useState<IndexEintrag[] | null>(null);
  const [fehler, setFehler] = useState(false);
  const geladen = useRef(false);

  async function ladeIndex() {
    if (geladen.current) return;
    geladen.current = true;
    try {
      const r = await fetch(mitBasePath("/suche.json"));
      setIndex(await r.json());
    } catch {
      setFehler(true);
      geladen.current = false;
    }
  }

  // ?q= aus der Adresse übernehmen
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    // erst nach dem ersten Rendern übernehmen (statisches HTML zeigt die Liste)
    const t = setTimeout(() => {
      setEingabe(q);
      setBegriff(q);
      void ladeIndex();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function suchen(e: React.FormEvent) {
    e.preventDefault();
    const q = eingabe.trim();
    setBegriff(q);
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
    if (q) void ladeIndex();
  }

  const treffer = index ? suche(index, begriff) : [];
  const nFolgen = treffer.filter((t) => t.art === "folge").length;
  const nArtikel = treffer.length - nFolgen;

  return (
    <>
      <div className={kopfClassName}>
        {titel}
        <form role="search" onSubmit={suchen} className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="folgen-suche" className="sr-only">
            Folgen durchsuchen
          </label>
          <div className="relative min-w-0 flex-1 sm:w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              <Lupe />
            </span>
            <input
              id="folgen-suche"
              type="search"
              name="q"
              value={eingabe}
              onChange={(e) => {
                setEingabe(e.target.value);
                if (!e.target.value) setBegriff("");
              }}
              onFocus={() => void ladeIndex()}
              placeholder="Folgen durchsuchen …"
              className="h-11 w-full rounded-md border border-border bg-surface pr-3 pl-10 text-text placeholder:text-muted focus:border-secondary-text focus:outline-none"
            />
          </div>
          <button type="submit" className="h-11 shrink-0 rounded-md bg-primary px-4 font-medium text-text transition hover:opacity-90">
            Suchen
          </button>
        </form>
      </div>

      {begriff ? (
        <section aria-live="polite">
          <p className="mb-4 text-muted">
            {fehler
              ? "Die Suche konnte nicht geladen werden."
              : !index
                ? "Suche wird geladen …"
                : `${nFolgen} ${nFolgen === 1 ? "Folge" : "Folgen"}${nArtikel ? ` und ${nArtikel} ${nArtikel === 1 ? "Blogartikel" : "Blogartikel"}` : ""} zu „${begriff}"`}
          </p>
          <ul className="space-y-4">
            {treffer.map((t) => (
              <li key={`${t.art}-${t.slug}`}>{t.art === "folge" ? <FolgenKarte folge={t} ueberschrift="h2" /> : <ArtikelTrefferKarte artikel={t} />}</li>
            ))}
          </ul>
          <button
            type="button"
            className="kipp kipp-dezent mt-6 inline-flex min-h-11 items-center rounded-full border border-border/70 bg-surface/80 px-5 font-medium"
            onClick={() => {
              setEingabe("");
              setBegriff("");
              const url = new URL(window.location.href);
              url.searchParams.delete("q");
              window.history.replaceState(null, "", url);
            }}
          >
            Suche zurücksetzen
          </button>
        </section>
      ) : (
        children
      )}
    </>
  );
}
