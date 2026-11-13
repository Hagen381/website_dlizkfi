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
//
// Ohne Layoutsprung bei /episodes/?q=… (CLS 0): Ein Inline-Skript in
// episodes/page.tsx setzt vor dem Zeichnen <html data-suche>, wenn ?q= in der
// Adresse steht. Dann blendet CSS (register.css) die statische Liste/Walze
// (.suche-standard) aus und zeigt stattdessen den Platzhalter .suche-vorab —
// gleicher Aufbau wie der Trefferbereich (Zeile „Suche wird geladen …“) und
// wie dieser mindestens eine Bildschirmhöhe hoch. Die Treffer füllen danach
// nur diesen Platz; nichts darüber oder daneben verschiebt sich, die
// Fusszeile liegt schon vorher unterhalb des Bildschirms. Dasselbe Skript
// fordert /suche.json gleich an (window.__sucheIndex), damit die Treffer
// nicht erst nach dem JavaScript geladen werden. Sobald die Suche
// läuft, entfernt die Komponente das Attribut wieder (sonst bliebe die Walze
// nach „Suche zurücksetzen“ verborgen).
export default function FolgenSuche({
  titel,
  children,
  kopfClassName = "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
}: {
  titel: ReactNode;
  children: ReactNode;
  kopfClassName?: string;
}) {
  const [eingabe, setEingabe] = useState("");
  const [begriff, setBegriff] = useState("");
  const [index, setIndex] = useState<IndexEintrag[] | null>(null);
  const [fehler, setFehler] = useState(false);
  const geladen = useRef(false);

  async function ladeIndex() {
    if (geladen.current) return;
    geladen.current = true;
    try {
      // Beim Laden mit ?q= hat das Inline-Skript (episodes/page.tsx) den Index
      // schon angefordert — parallel zum JavaScript statt danach.
      const w = window as Window & { __sucheIndex?: Promise<IndexEintrag[]> };
      const frueh = w.__sucheIndex;
      delete w.__sucheIndex;
      setIndex(await (frueh ?? fetch(mitBasePath("/suche.json")).then((r) => r.json())));
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

  // Platzhalter-Attribut entfernen, sobald React die Treffer (oder wieder die
  // Liste) selbst zeigt
  useEffect(() => {
    if (begriff) delete document.documentElement.dataset.suche;
  }, [begriff]);
  useEffect(() => () => void delete document.documentElement.dataset.suche, []);

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
          {/* feste Breite: kein seitlicher Sprung, wenn die Schrift nachlädt */}
          <button type="submit" className="h-11 w-24 shrink-0 rounded-md bg-primary px-2 font-medium text-text transition hover:opacity-90">
            Suchen
          </button>
        </form>
      </div>

      {begriff ? (
        <section aria-live="polite" className="suche-treffer">
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
          {/* erst mit den Treffern — sonst rutschte der Knopf beim Laden nach unten */}
          {(index || fehler) && (
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
          )}
        </section>
      ) : (
        <>
          {/* nur sichtbar, solange <html data-suche> gesetzt ist (Laden mit ?q=) */}
          <section className="suche-vorab suche-treffer" aria-hidden="true">
            <p className="mb-4 text-muted">Suche wird geladen …</p>
          </section>
          <div className="suche-standard">{children}</div>
        </>
      )}
    </>
  );
}
