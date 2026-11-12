import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import Cover from "@/components/Cover";
import FolgenSuche from "@/components/FolgenSuche";
import RegisterWalze, { type Monat } from "@/components/RegisterWalze";
import { artikelZurFolge } from "@/lib/blog";
import { datumKurz, dauerGesprochen, dauerText, folgen } from "@/lib/folgen";
import { breadcrumb, JsonLd } from "@/lib/seo";
import collage from "../../../content/startseite/collage.json";

// Folgenübersicht als 3D-Register (live seit 12.11.2026, vorher Entwurf
// /entwurf/folgen/). Alle Folgen stehen als Karten mit echtem Link im
// ausgelieferten HTML. Stile: ./register.css (beim Build ohne Kommentare
// inline eingebettet) und ./register-ohne-js.css (nur in <noscript>: einfache
// Liste statt Walze). Die Suche (FolgenSuche) zeigt Treffer als normale Liste.
// Blätterseiten /episodes/page/N/ gibt es nicht mehr (301 auf /episodes/ in
// der .htaccess, scripts/nach-dem-build.mjs).

function cssLesen(datei: string) {
  return fs
    .readFileSync(path.join(process.cwd(), "src/app/episodes", datei), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n\s*\n/g, "\n");
}
const registerCss = cssLesen("register.css");
const ohneJsCss = cssLesen("register-ohne-js.css");

export const metadata: Metadata = {
  title: "Alle Folgen",
  description: "Alle Folgen von „Das Leben ist zu kurz für irgendwann“: Auswandern nach Thailand, Familie, Mut und das Leben auf Koh Samui.",
  alternates: { canonical: "/episodes/" },
};

const MONATE = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sept", "Okt", "Nov", "Dez"];
const TZ = "Europe/Berlin";
function monatJahr(iso: string) {
  const d = new Date(iso);
  const m = Number(new Intl.DateTimeFormat("de-DE", { month: "numeric", timeZone: TZ }).format(d));
  const j = new Intl.DateTimeFormat("de-DE", { year: "numeric", timeZone: TZ }).format(d);
  return { schluessel: `${j}-${m}`, text: `${MONATE[m - 1]} ${j}` };
}

// Foto je Folge: mit Blogartikel dessen Kartenbild, sonst ein Foto der
// Startseiten-Collage. Zuordnung über einen Hash des Slugs (FNV-1a) — hängt
// nur vom eigenen Slug und der festen Fotoliste ab, ändert sich also nicht,
// wenn neue Folgen dazukommen.
const fotoListe = collage.polaroids.map((p) => p.datei);
function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
function fotoZurFolge(slug: string): { src: string; position: string } {
  const a = artikelZurFolge(slug);
  if (a?.kartenbild) return { src: a.kartenbild.src, position: a.kartenbildPosition };
  return { src: `/images/startseite/${fotoListe[fnv1a(slug) % fotoListe.length]}`, position: "50% 50%" };
}

// Polaroids links/rechts (nur ≥ 1280 px): Seite, Lage, Abstand x, oben, Drehung.
// „kopf“ = neben der Kopf-Glasfläche (x = Abstand zum Bühnenrand), endet
// oberhalb des Registers. „seite“ = neben Reitern/Walze (x = Abstand zur
// Registerkante), nur ab 1360 px — darunter ist dort kein Platz (register.css).
const POLAROIDS: [string, "links" | "rechts", "kopf" | "seite", number, number, number][] = [
  ["20251006_181734.jpg", "links", "kopf", 18, 40, -7],
  ["20251013_114024.jpg", "links", "seite", 30, 330, 5],
  ["20261003_124935.jpg", "links", "seite", 6, 560, -4],
  ["20251116_180922.jpg", "links", "seite", 28, 790, 6],
  ["20251118_165504.jpg", "rechts", "kopf", 20, 30, 6],
  ["20260926_084325.jpg", "rechts", "seite", 8, 320, -5],
  ["20251116_153451.jpg", "rechts", "seite", 30, 550, 4],
  ["20250919_150203.jpg", "rechts", "seite", 10, 780, -6],
];

export default function Folgen() {
  const eintraege = folgen.map((f) => ({ f, artikel: artikelZurFolge(f.slug), foto: fotoZurFolge(f.slug), monat: monatJahr(f.datum) }));

  const monate: Monat[] = [];
  eintraege.forEach((e, i) => {
    if (!monate.length || monate[monate.length - 1].schluessel !== e.monat.schluessel) monate.push({ schluessel: e.monat.schluessel, text: e.monat.text, start: i });
  });

  const reiterFotos = monate.map((m) => (
    <BlogBildRoh key={m.schluessel} bild={{ src: eintraege[m.start].foto.src, alt: "", width: 40, height: 40 }} className="reg-reiter-bild" style={{ objectPosition: eintraege[m.start].foto.position }} />
  ));

  const karten = eintraege.map(({ f, artikel, foto, monat }, i) => (
    <article key={f.slug} className="reg-karte">
      <span className="reg-fahne" aria-hidden="true">
        {monat.text}
      </span>
      <div className="reg-foto">
        <BlogBildRoh bild={{ src: foto.src, alt: "", width: 210, height: 210 }} priority={i === 0} className="reg-foto-bild" style={{ objectPosition: foto.position }} />
        <span className="reg-cover">
          <Cover groesse={42} sizes="42px" className="h-full w-full" />
        </span>
      </div>
      <div className="reg-text">
        <p className="reg-meta">
          <time dateTime={f.datum}>{datumKurz(f.datum)}</time>
          {f.dauer != null && (
            <>
              <span aria-hidden="true"> · {dauerText(f.dauer)}</span>
              <span className="sr-only">, Dauer {dauerGesprochen(f.dauer)}</span>
            </>
          )}
          {artikel && <span className="reg-badge">Blogartikel</span>}
        </p>
        <h2 className="reg-titel">
          <Link href={`/episodes/${f.slug}/`}>{f.titel}</Link>
        </h2>
        <p className="reg-beschreibung">{f.beschreibung}</p>
        <div className="reg-aktionen">
          <Link href={`/episodes/${f.slug}/`} className="reg-knopf" tabIndex={-1}>
            <span aria-hidden="true">▶</span> Anhören
          </Link>
          {artikel && (
            <Link href={`/blog/${artikel.slug}/`} className="reg-knopf reg-knopf-weiss">
              Zum Blogartikel
            </Link>
          )}
        </div>
      </div>
    </article>
  ));

  return (
    <>
      <style href="folgen-register" precedence="default">
        {registerCss}
      </style>
      <noscript>
        <style>{ohneJsCss}</style>
      </noscript>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Folgen", pfad: "/episodes/" }])] }} />

      <div className="reg-buehne">
        <div className="reg-seitenfotos" aria-hidden="true">
          {POLAROIDS.map(([datei, seite, lage, x, y, r]) => (
            <div key={datei} className={`reg-pola ${seite} ${lage}`} style={{ top: `${y}px`, ["--x" as string]: `${x}px`, ["--r" as string]: `${r}deg` } as CSSProperties}>
              <div className="reg-pola-rahmen">
                <BlogBildRoh bild={{ src: `/images/startseite/${datei}`, alt: "", width: 150, height: 150 }} className="reg-pola-bild" />
              </div>
            </div>
          ))}
        </div>

        <FolgenSuche
          kopfClassName="reg-kopf glas-flaeche"
          titel={<h1 className="reg-kopf-titel">Alle Folgen</h1>}
        >
          <p className="reg-hinweis">Mausrad, Ziehen oder Pfeiltasten ↑ ↓ · Reiter springen zum Monat</p>
          <RegisterWalze monate={monate} reiterFotos={reiterFotos} titel={eintraege.map((e) => e.f.titel)}>
            {karten}
          </RegisterWalze>
        </FolgenSuche>
      </div>
    </>
  );
}
