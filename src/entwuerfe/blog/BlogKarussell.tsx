"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Karussell der Blogübersicht (Entwurf, nur Vorschau): alle Artikel als
// Hochformat-Karten auf einem Ring (rotateY 360°/Anzahl). Ringgröße und
// Kartenpositionen rechnet das CSS (tan() aus Kartenbreite und Anzahl), hier
// nur die Drehung. Bedienung: Ziehen/Wischen waagerecht (≥ 40 px), Pfeiltasten
// ←/→ (nur bei Fokus im Karussell oder auf den Knöpfen/Punkten), Knöpfe,
// Punkte, Klick auf eine hintere Karte holt sie nach vorn, Klick auf die
// vordere öffnet den Artikel. Fokus auf eine Karte dreht sie nach vorn.
// Live-Region „Artikel x von y: Titel“. Bei 1–2 Artikeln kein Ring.

export default function BlogKarussell({ titel, infos, children }: { titel: string[]; infos: ReactNode[]; children: ReactNode }) {
  const n = titel.length;
  const ring = n >= 3;
  const karten = Children.toArray(children);
  // pos zählt ungebremst weiter, damit der Ring immer den kurzen Weg dreht;
  // die vordere Karte ist pos mod n.
  const [pos, setPos] = useState(0);
  const [ansage, setAnsage] = useState("");
  const posRef = useRef(0);
  const vorn = ((pos % n) + n) % n;

  const geh = useCallback(
    (ziel: number) => {
      posRef.current = ziel;
      setPos(ziel);
      const k = ((ziel % n) + n) % n;
      setAnsage(`Artikel ${k + 1} von ${n}: ${titel[k]}`);
    },
    [n, titel],
  );
  // Zu Karte k auf dem kürzesten Weg drehen
  const zuKarte = useCallback(
    (k: number) => {
      const aktuell = ((posRef.current % n) + n) % n;
      let d = k - aktuell;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      if (d !== 0) geh(posRef.current + d);
    },
    [geh, n],
  );

  const pfeile = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      geh(posRef.current + 1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      geh(posRef.current - 1);
      e.preventDefault();
    }
  };

  // Ziehen/Wischen waagerecht. touch-action: pan-y (CSS) lässt senkrechtes
  // Scrollen beim Browser. Wurde gezogen, wird der folgende Klick (auf einen
  // Kartenlink) verschluckt — ein normaler Klick bleibt ein Klick.
  const zug = useRef<{ x: number; id: number } | null>(null);
  const gezogen = useRef(false);
  const buehne = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = buehne.current;
    if (!el) return;
    const klick = (e: MouseEvent) => {
      if (gezogen.current) {
        e.preventDefault();
        e.stopPropagation();
        gezogen.current = false;
      }
    };
    el.addEventListener("click", klick, true);
    return () => el.removeEventListener("click", klick, true);
  }, []);

  return (
    <section className={`kar-bereich${ring ? "" : " kar-flach"}`} aria-roledescription="Karussell" aria-label="Blogartikel">
      {ring && <p className="kar-hinweis">Ziehen, Pfeile oder ← → · Klick auf eine Karte holt sie nach vorn</p>}

      <div
        ref={buehne}
        className="kar-ring-buehne"
        onKeyDown={pfeile}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          zug.current = { x: e.clientX, id: e.pointerId };
          gezogen.current = false;
        }}
        onPointerMove={(e) => {
          if (!zug.current || !ring) return;
          const dx = e.clientX - zug.current.x;
          if (Math.abs(dx) >= 40) {
            geh(posRef.current + (dx < 0 ? 1 : -1));
            zug.current.x = e.clientX;
            gezogen.current = true;
          }
        }}
        onPointerUp={() => (zug.current = null)}
        onPointerCancel={() => (zug.current = null)}
        onDragStart={(e) => e.preventDefault()}
      >
        <ol className="kar-ring" style={{ ["--n" as string]: n, ["--pos" as string]: pos }}>
          {karten.map((karte, i) => (
            <li
              key={i}
              className={`kar-platz${i === vorn ? " vorne" : " hinten"}`}
              style={{ ["--i" as string]: i }}
              onFocus={(e) => {
                // Nur Tastatur-Fokus dreht (bei Mausklick würde sonst erst der
                // Fokus drehen und der Klick danach schon den Artikel öffnen).
                if ((e.target as Element).matches(":focus-visible")) zuKarte(i);
              }}
              onClickCapture={(e) => {
                // Hintere Karte: nur nach vorn holen, nicht öffnen
                if (i !== vorn && !gezogen.current) {
                  e.preventDefault();
                  zuKarte(i);
                }
              }}
            >
              {karte}
            </li>
          ))}
        </ol>
      </div>

      <div className="kar-info glas-flaeche">{infos[vorn]}</div>

      {n > 1 && (
        // Punkte brechen nie um: Ab 5 Artikeln (mobil) bzw. 11 (breit) zeigt
        // stattdessen „3 / 6“ zwischen den Pfeilen (karussell.css).
        <div className={`kar-steuerung${n >= 5 ? " viele" : ""}${n >= 11 ? " sehr-viele" : ""}`} onKeyDown={pfeile}>
          <button type="button" className="kar-pfeil" aria-label="Vorheriger Artikel" onClick={() => geh(posRef.current - 1)}>
            ←
          </button>
          <div className="kar-punkte">
            {titel.map((t, i) => (
              <button key={i} type="button" className="kar-punkt" aria-label={`Artikel ${i + 1} von ${n}: ${t}`} aria-current={i === vorn ? "true" : undefined} onClick={() => zuKarte(i)}>
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          {/* Für Screenreader reicht die Live-Ansage */}
          <p className="kar-zaehler" aria-hidden="true">
            {vorn + 1} / {n}
          </p>
          <button type="button" className="kar-pfeil" aria-label="Nächster Artikel" onClick={() => geh(posRef.current + 1)}>
            →
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {ansage}
      </p>
    </section>
  );
}
