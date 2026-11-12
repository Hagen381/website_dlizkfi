"use client";

import { Children, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Walze des Folgen-Registers /episodes/ (Stile: src/app/episodes/register.css): alle Folgen als Karten
// auf einem Zylinder (rotateX, 24° Abstand, Radius --radius: 520 px, am
// Handy 640 px, damit die größere vordere Karte frei steht — register.css). Drehen per
// Mausrad, Wischen/Ziehen, Pfeiltasten ↑/↓ (nur bei Fokus in der Walze oder
// auf den Reitern) und Knöpfen.
// Wischen/Ziehen (Finger und Maus, siehe ziehenEnde): Die Walze folgt dem
// Finger gedämpft (1 Karte ≈ Kartenhöhe, höchstens ±1,25 Karten), beim
// Loslassen rastet sie auf einer Karte ein: unter 40 px zurück, sonst genau
// EINE Folge weiter/zurück; nur ein langer (≥ 180 px) und schneller
// (≥ 1 px/ms) Wisch springt weiter, höchstens 3. Mausrad: höchstens eine
// Folge pro Raststufe, danach 250 ms Sperre (Trackpad-Schwung verlängert die
// Sperre, damit nichts durchrauscht). Sichtbar sind nur die vorderen ±3 Karten, der Rest
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
const MINDESTWEG = 40; // px — darunter bleibt die Karte
const LANG = 180; // px — ab hier und schnell: mehr als eine Folge (180–359 px: 2, ab 360 px: 3)
const SCHNELL = 1; // px/ms (gemessen über die letzten 120 ms)
const MAX_SPRUNG = 3;
const RAD_SPERRE = 250; // ms

// Wie viele Folgen ein Wisch weiterdreht (ohne Vorzeichen)
export function wischSchritte(weg: number, tempo: number) {
  const w = Math.abs(weg);
  if (w < MINDESTWEG) return 0;
  if (w >= LANG && Math.abs(tempo) >= SCHNELL) return Math.min(MAX_SPRUNG, 1 + Math.floor(w / LANG));
  return 1;
}

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

  // Fotos der nahen Karten (±BILDER_AB) gleich laden: Die hinteren Karten
  // liegen gedreht außerhalb des sichtbaren Ausschnitts, „lazy“ würde dort
  // erst laden, wenn sie nach vorn kommen (Bild ploppt auf).
  useEffect(() => {
    walze.current?.querySelectorAll<HTMLImageElement>(".reg-platz.nah img[loading='lazy']").forEach((img) => (img.loading = "eager"));
  }, [nah]);

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

  // Mausrad (nur über der Walze; an den Enden darf die Seite weiterscrollen).
  // Höchstens eine Folge pro Raststufe, dann RAD_SPERRE ms Pause. Kleine
  // Schritte (Trackpad, auch dessen Nachschwung) werden gesammelt; solange sie
  // während der Sperre weiterkommen, verlängert sich die Sperre.
  useEffect(() => {
    const el = walze.current;
    if (!el) return;
    let summe = 0;
    let gesperrtBis = 0;
    const rad = (e: WheelEvent) => {
      const a = aktuellRef.current;
      const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      const richtung = Math.sign(dy);
      if (!richtung || Math.abs(e.deltaX) > Math.abs(dy)) return;
      if ((richtung < 0 && a === 0) || (richtung > 0 && a === anzahl - 1)) return;
      e.preventDefault();
      const jetzt = performance.now();
      if (jetzt < gesperrtBis) {
        if (Math.abs(dy) < 40) gesperrtBis = jetzt + RAD_SPERRE;
        summe = 0;
        return;
      }
      if (Math.sign(summe) !== richtung) summe = 0;
      summe += dy;
      if (Math.abs(summe) >= 40) {
        geh(a + richtung);
        summe = 0;
        gesperrtBis = jetzt + RAD_SPERRE;
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

  // Ziehen (Finger und Maus): die Walze folgt gedämpft, beim Loslassen
  // rastet sie ein (wischSchritte). Während des Ziehens wird der Zylinder
  // direkt gedreht (ohne Übergang, Klasse „zieht“), danach übernimmt wieder
  // React (aktuell) mit der normalen Einrast-Animation.
  const zylinder = useRef<HTMLOListElement>(null);
  const zug = useRef<{ y0: number; spur: { y: number; t: number }[]; aktiv: boolean } | null>(null);

  const kartenHoehe = () => walze.current?.querySelector<HTMLElement>(".reg-platz.vorne")?.offsetHeight || 220;
  const drehen = (grad: number, ziehend: boolean) => {
    const z = zylinder.current;
    if (!z) return;
    z.classList.toggle("zieht", ziehend);
    z.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${grad}deg)`;
  };
  const ziehenStart = (y: number) => {
    zug.current = { y0: y, spur: [{ y, t: performance.now() }], aktiv: false };
  };
  const ziehenBewegen = (y: number) => {
    const z = zug.current;
    if (!z) return;
    const t = performance.now();
    z.spur.push({ y, t });
    while (z.spur.length > 2 && t - z.spur[0].t > 120) z.spur.shift();
    const dy = y - z.y0;
    if (!z.aktiv && Math.abs(dy) < 8) return;
    z.aktiv = true;
    const a = aktuellRef.current;
    const n = listeRef.current.length;
    // Finger nach oben (dy < 0) → ältere Folge (+); gedämpft, max. ±1,25 Karten,
    // an den Enden nur ein kleines Nachgeben
    let versatz = Math.max(-1.25, Math.min(1.25, -dy / kartenHoehe()));
    if (a + versatz < 0) versatz = -a + (a + versatz) * 0.25;
    if (a + versatz > n - 1) versatz = n - 1 - a + (a + versatz - (n - 1)) * 0.25;
    drehen((a + versatz) * SCHRITT, true);
  };
  const ziehenEnde = (y: number | null) => {
    const z = zug.current;
    zug.current = null;
    if (!z || !z.aktiv) return;
    const dy = (y ?? z.spur[z.spur.length - 1].y) - z.y0;
    const erst = z.spur[0];
    const letzt = z.spur[z.spur.length - 1];
    const tempo = letzt.t > erst.t ? (letzt.y - erst.y) / (letzt.t - erst.t) : 0;
    const schritte = wischSchritte(dy, tempo);
    const n = listeRef.current.length;
    const ziel = Math.max(0, Math.min(n - 1, aktuellRef.current + (dy < 0 ? schritte : -schritte)));
    drehen(ziel * SCHRITT, false);
    geh(ziel);
  };

  // Finger: Beim ersten Bewegen wird entschieden. Senkrecht und die Walze
  // kann in diese Richtung weiter → drehen (Seite scrollt dann nicht). Am
  // ersten/letzten Eintrag oder waagerecht → nichts abfangen, die Seite
  // scrollt normal. Ein Tippen (ohne Bewegung) bleibt ein normaler Klick.
  useEffect(() => {
    const el = walze.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let modus: "offen" | "drehen" | "seite" | null = null;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        modus = null;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      modus = "offen";
      ziehenStart(startY);
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
          zug.current = null;
          return;
        }
        modus = "drehen";
      }
      e.preventDefault();
      ziehenBewegen(t.clientY);
    };
    const ende = (e: TouchEvent) => {
      if (modus === "drehen") ziehenEnde(e.changedTouches[0]?.clientY ?? null);
      modus = null;
    };
    const abbruch = () => {
      if (modus === "drehen") ziehenEnde(null);
      modus = null;
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", bewegen, { passive: false });
    el.addEventListener("touchend", ende);
    el.addEventListener("touchcancel", abbruch);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", bewegen);
      el.removeEventListener("touchend", ende);
      el.removeEventListener("touchcancel", abbruch);
    };
    // ziehen* lesen nur Refs — bewusst nicht als Abhängigkeit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anzahl, geh]);

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
          // Maus/Stift (Finger: Touch-Handler oben). Ein Klick auf einen Link
          // oder Knopf startet kein Ziehen.
          onPointerDown={(e) => {
            if (e.pointerType === "touch" || e.button !== 0 || (e.target as Element).closest("a, button")) return;
            ziehenStart(e.clientY);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== "touch") ziehenBewegen(e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== "touch") ziehenEnde(e.clientY);
          }}
          onPointerCancel={(e) => {
            if (e.pointerType !== "touch") ziehenEnde(null);
          }}
        >
          <ol ref={zylinder} className="reg-zylinder" style={{ transform: `translateZ(calc(var(--radius) * -1)) rotateX(${aktuell * SCHRITT}deg)` }}>
            {karten.map((karte, i) => {
              const p = platz.get(i);
              const abstand = p === undefined ? Infinity : Math.abs(p - aktuell);
              return (
                <li
                  key={i}
                  className={`reg-platz${abstand === 0 ? " vorne" : ""}${abstand > 0 ? " hinten" : ""}${abstand > SICHTBAR ? " weg" : ""}${p === undefined ? " aus" : ""}${nah.has(i) ? " nah" : ""}`}
                  style={{ transform: `rotateX(${-(p ?? i) * SCHRITT}deg) translateZ(var(--radius))` }}
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
