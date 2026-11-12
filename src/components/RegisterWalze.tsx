"use client";

import { Children, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Walze des Folgen-Registers /episodes/ (Stile: src/app/episodes/register.css): alle Folgen als Karten
// auf einem Zylinder (rotateX, 24° Abstand, Radius 520 px). Drehen per
// Mausrad, Ziehen, Pfeiltasten ↑/↓ (nur bei Fokus in der Walze oder auf den
// Reitern) und Knöpfen. Sichtbar sind nur die vorderen ±3 Karten, der Rest
// ist visibility: hidden (per Tab nicht erreichbar). Bekommt ein Link in einer
// sichtbaren Karte den Fokus, dreht die Walze sie nach vorn — so wandert das
// Sichtfenster beim Tabben mit. Links Themenreiter als Filter („Alle“ + die
// Themen aus content/themen.json mit Anzahl): Klick zeigt nur die Folgen des
// Themas (neueste vorn), nochmal klicken oder „Alle“ zeigt wieder alle. Das
// Thema steht als ?thema=<key> in der Adresse (beim Laden ausgewertet).
// Beim Drehen sagt eine höfliche Live-Region „Folge x von y: Titel“ an, beim
// Filtern „Thema X: n Folgen“. Alle Karten bleiben im DOM (echte Links für
// Suchmaschinen); herausgefilterte sind display: none.

export type ReiterThema = { key: string; label: string; anzahl: number };

const SCHRITT = 24; // Grad zwischen zwei Karten
const SICHTBAR = 3; // Karten vor/hinter der vordersten
const BILDER_AB = 5; // Fotos erst laden, wenn eine Karte so nah ist

// Fotos der Karten bis ±BILDER_AB um Platz z (in der gefilterten Liste l) laden
function naeher(alt: Set<number>, l: number[], z: number) {
  let neu: Set<number> | null = null;
  for (let k = z - BILDER_AB; k <= z + BILDER_AB; k++) {
    if (k >= 0 && k < l.length && !alt.has(l[k])) (neu ??= new Set(alt)).add(l[k]);
  }
  return neu ?? alt;
}

// reiterFotos: [Foto für „Alle“, dann je Thema] — in derselben Reihenfolge wie themen.
// kartenThemen: Themen-Schlüssel je Karte (gleiche Reihenfolge wie children).
export default function RegisterWalze({
  themen,
  kartenThemen,
  reiterFotos,
  titel,
  children,
}: {
  themen: ReiterThema[];
  kartenThemen: string[][];
  reiterFotos: ReactNode[];
  titel: string[];
  children: ReactNode;
}) {
  const [thema, setThema] = useState<string | null>(null);
  // Indizes (in children) der Karten, die der Filter zeigt — neueste zuerst
  const liste = useMemo(() => titel.map((_, i) => i).filter((i) => !thema || kartenThemen[i].includes(thema)), [thema, titel, kartenThemen]);
  const platz = useMemo(() => new Map(liste.map((i, p) => [i, p])), [liste]);
  const anzahl = liste.length;
  const [aktuell, setAktuell] = useState(0);
  const [ansage, setAnsage] = useState("");
  const [nah, setNah] = useState(() => new Set(Array.from({ length: Math.min(titel.length, BILDER_AB + 1) }, (_, i) => i)));
  const aktuellRef = useRef(0);
  // Gefilterte Liste für Ereignis-Handler (wird in waehle() gesetzt)
  const listeRef = useRef(liste);
  const walze = useRef<HTMLDivElement>(null);
  const reiterLeiste = useRef<HTMLElement>(null);
  const karten = Children.toArray(children);

  const geh = useCallback(
    (i: number) => {
      const l = listeRef.current;
      const z = Math.max(0, Math.min(l.length - 1, i));
      if (z !== aktuellRef.current) setAnsage(`Folge ${z + 1} von ${l.length}: ${titel[l[z]]}`);
      aktuellRef.current = z;
      setAktuell(z);
      setNah((alt) => naeher(alt, l, z));
    },
    [titel],
  );

  // Thema wählen (null = alle). Nochmals dasselbe Thema = wieder alle.
  const waehle = useCallback(
    (key: string | null, inAdresse = true) => {
      const t = key && themen.some((x) => x.key === key) ? key : null;
      const l = titel.map((_, i) => i).filter((i) => !t || kartenThemen[i].includes(t));
      listeRef.current = l;
      aktuellRef.current = 0;
      setThema(t);
      setAktuell(0);
      setNah((alt) => naeher(alt, l, 0));
      const label = themen.find((x) => x.key === t)?.label;
      setAnsage(label ? `Thema ${label}: ${l.length} ${l.length === 1 ? "Folge" : "Folgen"}` : `Alle Folgen: ${l.length} Folgen`);
      if (inAdresse) {
        const url = new URL(window.location.href);
        if (t) url.searchParams.set("thema", t);
        else url.searchParams.delete("thema");
        window.history.replaceState(null, "", url);
      }
    },
    [themen, titel, kartenThemen],
  );

  // ?thema=<key> aus der Adresse übernehmen (erst nach dem ersten Rendern —
  // das statische HTML zeigt alle Folgen)
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("thema");
    if (!key || !themen.some((x) => x.key === key)) return;
    const t = setTimeout(() => waehle(key, false), 0);
    return () => clearTimeout(t);
  }, [themen, waehle]);

  // Pfeiltasten nur, wenn der Fokus in der Walze oder auf den Reitern liegt
  // (nicht global — sonst ginge das Scrollen der Seite per Pfeiltaste kaputt).
  const pfeile = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      geh(aktuellRef.current + 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      geh(aktuellRef.current - 1);
      e.preventDefault();
    }
  };

  // Mausrad (nur über der Walze; an den Enden darf die Seite weiterscrollen)
  useEffect(() => {
    const el = walze.current;
    if (!el) return;
    let summe = 0;
    const rad = (e: WheelEvent) => {
      const a = aktuellRef.current;
      const richtung = Math.sign(e.deltaY);
      if ((richtung < 0 && a === 0) || (richtung > 0 && a === anzahl - 1)) return;
      e.preventDefault();
      summe += e.deltaY;
      if (Math.abs(summe) > 60) {
        geh(a + Math.sign(summe));
        summe = 0;
      }
    };
    el.addEventListener("wheel", rad, { passive: false });
    return () => el.removeEventListener("wheel", rad);
  }, [anzahl, geh]);

  // Polaroids links/rechts: Neigung zur Maus (max. 8°) und Lichtreflex wie
  // auf der Startseite. Nur Maus, nicht bei prefers-reduced-motion.
  useEffect(() => {
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
    let aktiv: HTMLElement | null = null;
    const los = () => {
      aktiv?.style.removeProperty("--tx");
      aktiv?.style.removeProperty("--ty");
      aktiv = null;
    };
    const bewegen = (e: PointerEvent) => {
      const rahmen = e.pointerType === "mouse" && !ruhig.matches ? ((e.target as Element | null)?.closest?.(".reg-pola")?.querySelector<HTMLElement>(".reg-pola-rahmen") ?? null) : null;
      if (rahmen !== aktiv) los();
      if (!rahmen) return;
      aktiv = rahmen;
      const r = rahmen.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      rahmen.style.setProperty("--ty", `${((x - 0.5) * 16).toFixed(1)}deg`);
      rahmen.style.setProperty("--tx", `${((0.5 - y) * 16).toFixed(1)}deg`);
      rahmen.style.setProperty("--gx", `${(x * 100).toFixed(0)}%`);
      rahmen.style.setProperty("--gy", `${(y * 100).toFixed(0)}%`);
    };
    document.addEventListener("pointermove", bewegen, { passive: true });
    return () => document.removeEventListener("pointermove", bewegen);
  }, []);

  // Wischen mit dem Finger: Beim ersten Wischen wird entschieden. Senkrecht
  // und die Walze kann in diese Richtung weiter → drehen (Seite scrollt dann
  // nicht). Am ersten/letzten Eintrag oder waagerecht → nichts abfangen, die
  // Seite scrollt normal. Pro 50 px eine Karte. Ein Tippen (ohne Bewegung)
  // bleibt ein normaler Klick.
  useEffect(() => {
    const el = walze.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let letzteY = 0;
    let modus: "offen" | "drehen" | "seite" | null = null;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        modus = null;
        return;
      }
      startX = e.touches[0].clientX;
      startY = letzteY = e.touches[0].clientY;
      modus = "offen";
    };
    const bewegen = (e: TouchEvent) => {
      if (!modus || modus === "seite") return;
      const t = e.touches[0];
      if (modus === "offen") {
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        const richtung = dy < 0 ? 1 : -1; // Finger nach oben → ältere Folge
        const a = aktuellRef.current;
        if (Math.abs(dx) > Math.abs(dy) || (richtung < 0 && a === 0) || (richtung > 0 && a === anzahl - 1)) {
          modus = "seite";
          return;
        }
        modus = "drehen";
        letzteY = startY;
      }
      e.preventDefault();
      const d = t.clientY - letzteY;
      if (Math.abs(d) >= 50) {
        geh(aktuellRef.current + (d < 0 ? 1 : -1));
        letzteY = t.clientY;
      }
    };
    const ende = () => (modus = null);
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", bewegen, { passive: false });
    el.addEventListener("touchend", ende);
    el.addEventListener("touchcancel", ende);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", bewegen);
      el.removeEventListener("touchend", ende);
      el.removeEventListener("touchcancel", ende);
    };
  }, [anzahl, geh]);

  // Ziehen mit Maus oder Stift (Finger: siehe oben). Ein Klick auf einen Link
  // startet kein Ziehen.
  const zugStart = useRef<number | null>(null);

  // Aktiven Reiter in der mobilen Leiste sichtbar halten
  useEffect(() => {
    const leiste = reiterLeiste.current;
    const aktiv = leiste?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (leiste && aktiv && getComputedStyle(leiste).flexDirection === "row") {
      const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
      leiste.scrollTo({ left: aktiv.offsetLeft - leiste.clientWidth / 2 + aktiv.clientWidth / 2, behavior: ruhig ? "auto" : "smooth" });
    }
  }, [thema]);

  const reiter = [{ key: null, label: "Alle", anzahl: titel.length }, ...themen];
  const themaLabel = themen.find((x) => x.key === thema)?.label;

  return (
    <div className="reg-register">
      <nav className="reg-reiter" aria-label="Themen" ref={reiterLeiste} onKeyDown={pfeile}>
        {reiter.map((r, j) => (
          <button
            key={r.key ?? "alle"}
            type="button"
            className="reg-reiter-knopf"
            aria-pressed={r.key === thema}
            onClick={() => waehle(r.key === thema ? null : r.key)}
          >
            <span className="reg-reiter-foto" aria-hidden="true">
              {reiterFotos[j]}
            </span>
            <span className="reg-reiter-text">{r.label}</span>
            <span className="reg-reiter-zahl">
              <span className="sr-only">, </span>
              {r.anzahl}
              <span className="sr-only"> {r.anzahl === 1 ? "Folge" : "Folgen"}</span>
            </span>
          </button>
        ))}
      </nav>

      <div>
        <div
          ref={walze}
          className="reg-walze"
          tabIndex={0}
          role="region"
          aria-roledescription="Walze"
          aria-label={`${themaLabel ? `Thema ${themaLabel}` : "Alle Folgen"}, ${aktuell + 1} von ${anzahl}. Mit Pfeiltasten auf und ab drehen.`}
          onKeyDown={pfeile}
          onPointerDown={(e) => {
            if (e.pointerType === "touch" || (e.target as Element).closest("a")) return;
            zugStart.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (zugStart.current === null) return;
            const d = e.clientY - zugStart.current;
            if (Math.abs(d) > 50) {
              geh(aktuell + (d < 0 ? 1 : -1));
              zugStart.current = e.clientY;
            }
          }}
          onPointerUp={() => (zugStart.current = null)}
          onPointerCancel={() => (zugStart.current = null)}
        >
          <ol className="reg-zylinder" style={{ transform: `translateZ(-520px) rotateX(${aktuell * SCHRITT}deg)` }}>
            {karten.map((karte, i) => {
              const p = platz.get(i);
              const abstand = p === undefined ? Infinity : Math.abs(p - aktuell);
              return (
                <li
                  key={i}
                  className={`reg-platz${abstand === 0 ? " vorne" : ""}${abstand > 0 ? " hinten" : ""}${abstand > SICHTBAR ? " weg" : ""}${p === undefined ? " aus" : ""}${nah.has(i) ? " nah" : ""}`}
                  style={{ transform: `rotateX(${-(p ?? i) * SCHRITT}deg) translateZ(520px)` }}
                  onFocus={() => {
                    if (p !== undefined && p !== aktuell) geh(p);
                  }}
                >
                  {karte}
                </li>
              );
            })}
          </ol>
        </div>
        <p className="sr-only" aria-live="polite">
          {ansage}
        </p>
        <div className="reg-steuerung">
          <button type="button" aria-label="Neuere Folge" onClick={() => geh(aktuell - 1)} disabled={aktuell === 0}>
            ↑
          </button>
          <button type="button" aria-label="Ältere Folge" onClick={() => geh(aktuell + 1)} disabled={aktuell === anzahl - 1}>
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
