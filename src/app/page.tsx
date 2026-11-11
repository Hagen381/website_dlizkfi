import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { BlogBildRoh } from "@/components/BlogBild";
import CollageSteuerung from "@/components/CollageSteuerung";
import PlattformLogo from "@/components/PlattformLogo";
import StartseiteFolgen from "@/components/StartseiteFolgen";
import { heroZeilen } from "@/lib/startseite";
import { plattformen, siteConfig } from "@/lib/site-config";
import collage from "../../content/startseite/collage.json";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  alternates: { canonical: "/" },
};

// Hero mit Polaroid-Collage (bewusste Abweichung vom PodView-Original).
// Layout: content/startseite/collage.json, Fotos: content/startseite/bilder/
// (vorbereitet von scripts/startseite-bilder.mjs), Stile: ./startseite.css,
// Maus-Neigung: CollageSteuerung. Unter dem Hero: StartseiteFolgen.

// CSS inline statt als eigene Datei: spart mobil eine render-blockierende
// Stylesheet-Anfrage. Beim Build gelesen, Kommentare entfernt; React hängt es
// in den <head>.
const collageCss = fs
  .readFileSync(path.join(process.cwd(), "src/app/startseite.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\n\s*\n/g, "\n");

type Polaroid = (typeof collage.polaroids)[number];

// Mobil (< 640 px): 8 Fotos in zwei Reihen, Platz laut "mobil_reihenfolge"
// (1–4 obere Reihe, 5–8 untere Reihe).
const mobilNr = new Map(collage.polaroids.flatMap((p) => (p.mobil && "mobil_reihenfolge" in p ? [[p.datei, p.mobil_reihenfolge] as const] : [])));

function stil(p: Polaroid): CSSProperties {
  return {
    [p.seite === "links" ? "left" : "right"]: `${p.abstand_rand_prozent}%`,
    top: `${p.oben_px}px`,
    width: `${p.breite_px}px`,
    zIndex: p.z,
    ["--r" as string]: `${p.drehung_grad}deg`,
  };
}

export default function Startseite() {
  return (
    <>
      <style href="startseite-collage" precedence="default">
        {collageCss}
      </style>

      {/* Hero */}
      <section className="collage-hero">
        {/* Deko: für Screenreader unsichtbar, nicht fokussierbar */}
        <div className="collage-deko" aria-hidden="true">
          {collage.polaroids.map((p) => {
            const nr = mobilNr.get(p.datei);
            const klassen = ["pola", p.seite === "rechts" ? "pola-rechts" : "pola-links", p.band_hinter_der_mitte ? "pola-band" : "", nr ? `pola-mobil pola-m${nr}` : ""].filter(Boolean).join(" ");
            return (
              <div key={p.datei} className={klassen} style={stil(p)}>
                <div className="pola-rahmen">
                  <div className="pola-foto">
                    {/* Feste Anzeigebreite (≤ 188 px, beim Hover ×1,24) → srcset 256 w (1x) / 384 w (2x) */}
                    <BlogBildRoh bild={{ src: `/images/startseite/${p.datei}`, alt: "", width: 190, height: 190 }} className="pola-bild pola-bild-gross" />
                    {/* Mobil (≈ 92 px) eigenes, kleineres Bild: 128 w / 256 w. Das jeweils
                        ausgeblendete wird wegen loading="lazy" nicht geladen. */}
                    {nr && <BlogBildRoh bild={{ src: `/images/startseite/${p.datei}`, alt: "", width: 100, height: 100 }} className="pola-bild pola-bild-klein" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Glasfläche: Inhalt, Reihenfolge, Schriften und Größen wie im bisherigen Hero */}
        <div className="collage-glas">
          <div className="collage-schimmer" aria-hidden="true" />
          <p className="glas-z1 mb-6 text-sm font-medium tracking-widest text-muted uppercase">{siteConfig.moderation}</p>
          <h1 className="glas-z2 text-4xl leading-none font-bold tracking-tight text-balance lg:text-6xl lg:tracking-[-1.5px]">{siteConfig.name}</h1>
          <p className="glas-z1 mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            {heroZeilen.map((z, i) => (
              <span key={i}>
                {z}
                {i < heroZeilen.length - 1 && <br />}
              </span>
            ))}
          </p>
          <div className="glas-z1 mt-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Anhören auf</p>
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {plattformen.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener" aria-label={p.name} title={p.name} className="kipp kipp-dezent flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 hover:bg-surface">
                    <PlattformLogo p={p} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CollageSteuerung />

      <StartseiteFolgen />
    </>
  );
}
