"use client";

import { useCallback, useEffect, useState } from "react";

// Blättern in der Blogübersicht /blog/ (6 Kacheln pro Seite, Stile:
// src/app/blog/blog.css). Alle Kacheln stehen im ausgelieferten HTML; welche
// Seite sichtbar ist, entscheidet das Attribut data-blog-seite am <html>
// (CSS-Regeln je Seite aus page.tsx). Ein Inline-Skript vor dem Raster setzt
// es beim Laden aus ?seite=N, bevor gezeichnet wird (CLS 0); diese Komponente
// gleicht es beim Einhängen mit der Adresse ab (z. B. nach dem Zurückkommen
// per Link) und setzt es beim Blättern. Danach: Fokus auf die erste Kachel
// der neuen Seite, Live-Ansage „Seite x von y“, ?seite=N in der Adresse
// (Seite 1 ohne Parameter; Canonical bleibt /blog/).

export function seiteAusAdresse(seiten: number) {
  const s = Number(new URLSearchParams(window.location.search).get("seite"));
  return Number.isInteger(s) && s >= 1 && s <= seiten ? s : 1;
}

function seiteSetzen(s: number) {
  const html = document.documentElement;
  if (s > 1) html.dataset.blogSeite = String(s);
  else delete html.dataset.blogSeite;
}

export default function BlogBlaettern({ seiten }: { seiten: number }) {
  const [seite, setSeite] = useState(1);
  const [ansage, setAnsage] = useState("");

  useEffect(() => {
    const html = document.documentElement;
    const s = seiteAusAdresse(seiten);
    seiteSetzen(s);
    // erst nach dem ersten Rendern übernehmen (statisches HTML zeigt „1 / n“)
    const t = setTimeout(() => setSeite(s), 0);
    return () => {
      clearTimeout(t);
      delete html.dataset.blogSeite;
      delete html.dataset.blogGeblaettert;
    };
  }, [seiten]);

  const geh = useCallback(
    (ziel: number) => {
      const s = Math.max(1, Math.min(seiten, ziel));
      document.documentElement.dataset.blogGeblaettert = "";
      seiteSetzen(s);
      setSeite(s);
      setAnsage(`Seite ${s} von ${seiten}`);
      const url = new URL(window.location.href);
      if (s > 1) url.searchParams.set("seite", String(s));
      else url.searchParams.delete("seite");
      window.history.replaceState(null, "", url);
      document.querySelector<HTMLElement>(`.br-platz[data-seite="${s}"] a`)?.focus();
    },
    [seiten],
  );

  return (
    <>
      <nav className="br-steuerung" aria-label="Seiten">
        <button type="button" className="kipp kipp-dezent br-pfeil" aria-label="Vorherige Seite" disabled={seite === 1} onClick={() => geh(seite - 1)}>
          ←
        </button>
        <p className="br-zaehler">
          <span className="sr-only">Seite </span>
          {seite} / {seiten}
        </p>
        <button type="button" className="kipp kipp-dezent br-pfeil" aria-label="Nächste Seite" disabled={seite === seiten} onClick={() => geh(seite + 1)}>
          →
        </button>
      </nav>
      <p className="sr-only" aria-live="polite">
        {ansage}
      </p>
    </>
  );
}
