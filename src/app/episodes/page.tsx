import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import Cover from "@/components/Cover";
import FolgenSuche from "@/components/FolgenSuche";
import RegisterWalze from "@/components/RegisterWalze";
import { artikelZurFolge } from "@/lib/blog";
import { datumKurz, dauerGesprochen, dauerText, folgen } from "@/lib/folgen";
import { fotoZurFolge } from "@/lib/folgen-foto";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { themen, themenZurFolge } from "@/lib/themen";

// Folgenübersicht als 3D-Register (live seit 12.11.2026, vorher Entwurf
// /entwurf/folgen/). Alle Folgen stehen als Karten mit echtem Link im
// ausgelieferten HTML. Stile: ./register.css (beim Build ohne Kommentare
// inline eingebettet) und ./register-ohne-js.css (nur in <noscript>: einfache
// Liste statt Walze). Die Suche (FolgenSuche) zeigt Treffer als normale Liste.
// Links neben der Walze die Themenreiter (Filter, content/themen.json).
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

// Foto je Folge: src/lib/folgen-foto.ts (Blog-Kartenbild, sonst Folgenbild,
// sonst Collage-Foto).

// Polaroids links/rechts (nur ≥ 1280 px): Seite, Lage, Abstand x, oben, Drehung.
// „kopf“ = neben der Kopf-Glasfläche (x = Abstand zum Bühnenrand), endet
// oberhalb des Registers. „seite“ = neben Reitern/Walze (x = Abstand zur
// Registerkante), nur ab 1360 px — darunter ist dort kein Platz (register.css).
const POLAROIDS: [string, "links" | "rechts", "kopf" | "seite", number, number, number][] = [
  ["20251006_181734.jpg", "links", "kopf", 18, 12, -7],
  ["20251013_114024.jpg", "links", "seite", 30, 330, 5],
  ["20261003_124935.jpg", "links", "seite", 6, 560, -4],
  ["20251116_180922.jpg", "links", "seite", 28, 790, 6],
  ["20251118_165504.jpg", "rechts", "kopf", 20, 8, 6],
  ["20260926_084325.jpg", "rechts", "seite", 8, 320, -5],
  ["20251116_153451.jpg", "rechts", "seite", 30, 550, 4],
  ["20250919_150203.jpg", "rechts", "seite", 10, 780, -6],
];

export default function Folgen() {
  const eintraege = folgen.map((f) => ({ f, artikel: artikelZurFolge(f.slug), foto: fotoZurFolge(f.slug), themen: themenZurFolge(f.slug).map((t) => t.key) }));

  // Themenreiter: Anzahl je Thema, Foto = Foto der neuesten Folge des Themas
  // („Alle“: neueste Folge überhaupt). Themen ohne Folge entfallen.
  const reiterThemen = themen.map((t) => ({ ...t, anzahl: eintraege.filter((e) => e.themen.includes(t.key)).length })).filter((t) => t.anzahl > 0);
  const reiterFotos = [null, ...reiterThemen.map((t) => t.key)].map((key) => {
    const e = eintraege.find((x) => !key || x.themen.includes(key))!;
    return <BlogBildRoh key={key ?? "alle"} bild={{ src: e.foto.src, alt: "", width: 40, height: 40 }} className="reg-reiter-bild" style={{ objectPosition: e.foto.position }} />;
  });

  const karten = eintraege.map(({ f, artikel, foto }, i) => (
    <article key={f.slug} className="reg-karte">
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
          <RegisterWalze themen={reiterThemen} kartenThemen={eintraege.map((e) => e.themen)} reiterFotos={reiterFotos} titel={eintraege.map((e) => e.f.titel)}>
            {karten}
          </RegisterWalze>
        </FolgenSuche>
      </div>
    </>
  );
}
