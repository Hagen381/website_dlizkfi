import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import Cover from "@/components/Cover";
import FolgenSuche from "@/components/FolgenSuche";
import { artikelZurFolge } from "@/lib/blog";
import { datumKurz, dauerGesprochen, dauerText, folgen } from "@/lib/folgen";
import collage from "../../../content/startseite/collage.json";
import RegisterWalze, { type Monat } from "./RegisterWalze";

// ENTWURF der Folgenübersicht als 3D-Register — NUR VORSCHAU.
// Route /entwurf/folgen/ legt scripts/entwuerfe.mjs nur im Vorschau-Build an.
// Vorlage: folgen-register-referenz.html (Zweig uebergabe, nicht im Repo).

const registerCss = fs
  .readFileSync(path.join(process.cwd(), "src/entwuerfe/folgen/register.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\n\s*\n/g, "\n");

export const metadata: Metadata = {
  title: "Entwurf Folgenübersicht",
  alternates: { canonical: "/entwurf/folgen/" },
  robots: { index: false, follow: false },
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

// Polaroids links/rechts (nur ≥ 1280 px): Seite, Abstand zum Rand, oben, Drehung
const POLAROIDS: [string, "links" | "rechts", number, number, number][] = [
  ["20251006_181734.jpg", "links", 18, 40, -7],
  ["20251013_114024.jpg", "links", 96, 250, 5],
  ["20261003_124935.jpg", "links", 22, 470, -4],
  ["20251116_180922.jpg", "links", 100, 690, 6],
  ["20251118_165504.jpg", "rechts", 20, 30, 6],
  ["20260926_084325.jpg", "rechts", 100, 240, -5],
  ["20251116_153451.jpg", "rechts", 16, 470, 4],
  ["20250919_150203.jpg", "rechts", 96, 690, -6],
];

export default function FolgenRegisterEntwurf() {
  const eintraege = folgen.map((f) => ({ f, artikel: artikelZurFolge(f.slug), foto: fotoZurFolge(f.slug), monat: monatJahr(f.datum) }));

  const monate: Monat[] = [];
  eintraege.forEach((e, i) => {
    if (!monate.length || monate[monate.length - 1].schluessel !== e.monat.schluessel) monate.push({ schluessel: e.monat.schluessel, text: e.monat.text, start: i });
  });

  const reiterFotos = monate.map((m) => (
    <BlogBildRoh key={m.schluessel} bild={{ src: eintraege[m.start].foto.src, alt: "", width: 40, height: 40 }} className="reg-reiter-bild" style={{ objectPosition: eintraege[m.start].foto.position }} />
  ));

  const karten = eintraege.map(({ f, artikel, foto, monat }) => (
    <article key={f.slug} className="reg-karte">
      <span className="reg-fahne" aria-hidden="true">
        {monat.text}
      </span>
      <div className="reg-foto">
        <BlogBildRoh bild={{ src: foto.src, alt: "", width: 210, height: 210 }} className="reg-foto-bild" style={{ objectPosition: foto.position }} />
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
      <style href="register-entwurf" precedence="default">
        {registerCss}
      </style>
      <p className="entwurf-balken">Entwurf – nicht live</p>

      <div className="reg-buehne">
        <div className="reg-seitenfotos" aria-hidden="true">
          {POLAROIDS.map(([datei, seite, x, y, r]) => (
            <div key={datei} className="reg-pola" style={{ [seite === "links" ? "left" : "right"]: `${x}px`, top: `${y}px`, ["--r" as string]: `${r}deg` } as CSSProperties}>
              <div className="reg-pola-rahmen">
                <BlogBildRoh bild={{ src: `/images/startseite/${datei}`, alt: "", width: 150, height: 150 }} className="reg-pola-bild" />
              </div>
            </div>
          ))}
        </div>

        <FolgenSuche
          kopfClassName="reg-kopf glas-flaeche"
          titel={
            <div>
              {/* Kleine Zeile wie in der Vorlage; für Screenreader ausgeblendet, weil
                  sie den Titel nur wiederholt. H1 wie auf /episodes/. */}
              <p className="reg-kopf-klein" aria-hidden="true">
                Alle Folgen
              </p>
              <h1 className="reg-kopf-titel">Alle Folgen</h1>
            </div>
          }
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
