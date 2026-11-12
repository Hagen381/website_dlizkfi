"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Themenfilter und Blättern in der Blogübersicht /blog/ (6 Kacheln pro Seite,
// Stile: src/app/blog/blog.css, Regeln je Thema/Seite erzeugt page.tsx).
//
// Alle Kacheln stehen im ausgelieferten HTML. Was sichtbar ist, entscheiden
// zwei Attribute am <html>: data-blog-thema="<key>" (fehlt = alle) und
// data-blog-seite="N" (fehlt = Seite 1). Ein Inline-Skript vor der
// Chip-Leiste setzt beide beim Laden aus ?thema=<key>&seite=N, bevor
// gezeichnet wird (CLS 0); diese Komponente gleicht sie beim Einhängen mit
// der Adresse ab (z. B. nach einem Link aus einem Blogartikel, dort läuft das
// Inline-Skript nicht) und setzt sie beim Filtern/Blättern.
//
// Chips: „Alle“ + jedes Thema mit mindestens einem Artikel (mit Anzahl),
// einzeilig und waagerecht wischbar. Aktiv = gelb (aria-pressed; das Gelb
// selbst kommt aus den Regeln je Thema, damit es schon vor dem Hydrieren
// stimmt). Klick filtert (nochmal klicken = alle), Seite zurück auf 1,
// Live-Ansage „Thema X: n Artikel“, ?thema=<key> in der Adresse.
// Blättern: ← „1 / n“ → nur bei mehr als 6 Treffern; Fokus auf die erste
// Kachel der neuen Seite, Live-Ansage „Seite x von y“, ?seite=N (Seite 1
// ohne Parameter). Canonical bleibt /blog/. Ohne JS: keine Chips, keine
// Steuerung, alle Kacheln (blog-ohne-js.css).
// seitenJe: Seitenzahl je Thema, Schlüssel "" = alle Artikel.

export type BlogThema = { key: string; label: string; anzahl: number };

function ausAdresse(seitenJe: Record<string, number>) {
  const p = new URLSearchParams(window.location.search);
  const t = p.get("thema");
  const thema = t && Object.hasOwn(seitenJe, t) ? t : null;
  const n = seitenJe[thema ?? ""];
  const s = Number(p.get("seite"));
  return { thema, seite: Number.isInteger(s) && s >= 1 && s <= n ? s : 1 };
}

function setzen(thema: string | null, seite: number) {
  const d = document.documentElement.dataset;
  if (thema) d.blogThema = thema;
  else delete d.blogThema;
  if (seite > 1) d.blogSeite = String(seite);
  else delete d.blogSeite;
}

// useLayoutEffect nur im Browser (im statischen Export sonst eine Warnung)
const useFrueh = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function BlogBlaettern({ themen, seitenJe, gesamt, children }: { themen: BlogThema[]; seitenJe: Record<string, number>; gesamt: number; children: ReactNode }) {
  const [thema, setThema] = useState<string | null>(null);
  const [seite, setSeite] = useState(1);
  const [ansage, setAnsage] = useState("");
  const leiste = useRef<HTMLDivElement>(null);
  const seiten = seitenJe[thema ?? ""] ?? 1;
  const mitBlaettern = Object.values(seitenJe).some((n) => n > 1);

  useFrueh(() => {
    const html = document.documentElement;
    const a = ausAdresse(seitenJe);
    setzen(a.thema, a.seite);
    // erst nach dem ersten Rendern übernehmen (statisches HTML zeigt „Alle“, „1 / n“)
    const t = setTimeout(() => {
      setThema(a.thema);
      setSeite(a.seite);
    }, 0);
    return () => {
      clearTimeout(t);
      delete html.dataset.blogThema;
      delete html.dataset.blogSeite;
      delete html.dataset.blogGeblaettert;
      delete html.dataset.blogGefiltert;
    };
  }, [seitenJe]);

  // Aktiven Chip in der Leiste sichtbar halten (auch beim Laden mit ?thema=)
  useEffect(() => {
    const l = leiste.current;
    const aktiv = l?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!l || !aktiv || l.scrollWidth <= l.clientWidth) return;
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
    l.scrollTo({ left: aktiv.offsetLeft - l.clientWidth / 2 + aktiv.clientWidth / 2, behavior: ruhig ? "auto" : "smooth" });
  }, [thema]);

  const adresse = (t: string | null, s: number) => {
    const url = new URL(window.location.href);
    if (t) url.searchParams.set("thema", t);
    else url.searchParams.delete("thema");
    if (s > 1) url.searchParams.set("seite", String(s));
    else url.searchParams.delete("seite");
    window.history.replaceState(null, "", url);
  };

  const waehle = useCallback(
    (key: string | null) => {
      const t = key && key !== thema ? key : null;
      const html = document.documentElement.dataset;
      html.blogGefiltert = "";
      html.blogGeblaettert = "";
      setzen(t, 1);
      setThema(t);
      setSeite(1);
      const x = themen.find((y) => y.key === t);
      setAnsage(x ? `Thema ${x.label}: ${x.anzahl} Artikel` : `Alle Artikel: ${gesamt} Artikel`);
      adresse(t, 1);
    },
    [thema, themen, gesamt],
  );

  const geh = useCallback(
    (ziel: number) => {
      const s = Math.max(1, Math.min(seiten, ziel));
      document.documentElement.dataset.blogGeblaettert = "";
      setzen(thema, s);
      setSeite(s);
      setAnsage(`Seite ${s} von ${seiten}`);
      adresse(thema, s);
      const sel = thema ? `.br-platz[data-t-${thema}="${s}"] a` : `.br-platz[data-seite="${s}"] a`;
      document.querySelector<HTMLElement>(sel)?.focus();
    },
    [seiten, thema],
  );

  const chips = [{ key: null, label: "Alle", anzahl: gesamt }, ...themen];

  return (
    <>
      {themen.length > 0 && (
        <div className="br-themen" role="group" aria-label="Nach Thema filtern" ref={leiste}>
          {chips.map((c) => (
            <button key={c.key ?? "alle"} type="button" className="br-chip" data-thema={c.key ?? "alle"} aria-pressed={c.key === thema} onClick={() => waehle(c.key)}>
              <span>{c.label}</span>
              <span className="br-chip-zahl">
                <span className="sr-only">, </span>
                {c.anzahl}
                <span className="sr-only"> Artikel</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {children}
      {mitBlaettern && (
        <nav className="br-steuerung" aria-label="Seiten">
          <button type="button" className="kipp kipp-dezent br-pfeil" aria-label="Vorherige Seite" disabled={seite === 1} onClick={() => geh(seite - 1)}>
            ←
          </button>
          <p className="br-zaehler">
            <span className="sr-only">Seite </span>
            {seite} / {seiten}
          </p>
          <button type="button" className="kipp kipp-dezent br-pfeil" aria-label="Nächste Seite" disabled={seite >= seiten} onClick={() => geh(seite + 1)}>
            →
          </button>
        </nav>
      )}
      <p className="sr-only" aria-live="polite">
        {ansage}
      </p>
    </>
  );
}
