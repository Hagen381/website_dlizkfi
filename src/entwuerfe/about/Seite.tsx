import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { BlogBildRoh } from "@/components/BlogBild";
import Cover from "@/components/Cover";
import PlattformLogo from "@/components/PlattformLogo";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { plattformen, siteConfig } from "@/lib/site-config";
import PolaroidNeigung from "./PolaroidNeigung";

// ENTWURF der Über-Seite im Stil von Startseite, /episodes/ und /blog/ —
// NUR VORSCHAU. Route /entwurf/about/ legt scripts/entwuerfe.mjs nur im
// Vorschau-Build an. Text WÖRTLICH aus src/app/about/page.tsx (nichts
// umschreiben, nichts ergänzen). Fotos nur aus content/startseite/bilder/
// (geprüft), jedes höchstens einmal, rein dekorativ.

const ueberCss = fs
  .readFileSync(path.join(process.cwd(), "src/entwuerfe/about/ueber.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\n\s*\n/g, "\n");

export const metadata: Metadata = {
  title: "Entwurf Über",
  description: siteConfig.description,
  alternates: { canonical: "/entwurf/about/" },
  robots: { index: false, follow: false },
};

// Polaroids um den Kopf: ab 1024 px je zwei links/rechts, darunter eine Reihe
// mit 4 kleinen über dem Kopf (dieselben vier Elemente, nur anders gesetzt).
// Datei, Seite, Drehung
const KOPF: [string, "links" | "rechts", number][] = [
  ["20251006_181734.jpg", "links", -7],
  ["20261003_124935.jpg", "links", 5],
  ["20251118_165504.jpg", "rechts", 6],
  ["20251013_114024.jpg", "rechts", -4],
];
// Fotostreifen zwischen den Absätzen: je 3, leicht gedreht
const STREIFEN_1: [string, number][] = [
  ["20250919_150203.jpg", -4],
  ["20251116_153451.jpg", 3],
  ["20260926_084325.jpg", -2],
];
const STREIFEN_2: [string, number][] = [
  ["20251116_180922.jpg", 4],
  ["20261006_112754.jpg", -3],
  ["20251105_091626.jpg", 2],
];

function Polaroid({ datei, drehung, klasse = "", breite }: { datei: string; drehung: number; klasse?: string; breite: number }) {
  return (
    <div className={`ab-pola ${klasse}`} style={{ ["--r" as string]: `${drehung}deg` } as CSSProperties}>
      <div className="ab-pola-rahmen">
        <div className="ab-pola-foto">
          <BlogBildRoh bild={{ src: `/images/startseite/${datei}`, alt: "", width: breite, height: breite }} className="ab-pola-bild" />
        </div>
      </div>
    </div>
  );
}

function Streifen({ fotos }: { fotos: [string, number][] }) {
  return (
    <div className="ab-streifen" aria-hidden="true">
      {fotos.map(([datei, r]) => (
        <Polaroid key={datei} datei={datei} drehung={r} breite={190} />
      ))}
    </div>
  );
}

export default function UeberEntwurf() {
  return (
    <>
      <style href="ueber-entwurf" precedence="default">
        {ueberCss}
      </style>
      <p className="entwurf-balken">Entwurf – nicht live</p>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Über", pfad: "/about/" }])] }} />

      <div className="ab-buehne">
        <div className="ab-kopf-bereich">
          <div className="ab-kopf-fotos" aria-hidden="true">
            {KOPF.map(([datei, seite, r], i) => (
              <Polaroid key={datei} datei={datei} drehung={r} breite={160} klasse={`ab-pola-${seite} ab-pola-k${i + 1}`} />
            ))}
          </div>
          <header className="ab-kopf glas-flaeche">
            <Cover groesse={192} sizes="(min-width: 640px) 176px, 144px" className="ab-cover" priority />
            <div>
              <h1 className="ab-titel">Über {siteConfig.name}</h1>
              <p className="ab-moderation">Moderiert von {siteConfig.moderation}</p>
            </div>
          </header>
        </div>

        <div className="ab-lesen glas-flaeche">
          <p>{siteConfig.tagline}</p>
          <p>Kennst du diesen Gedanken: Irgendwann mache ich das auch mal?</p>
        </div>

        <p className="ab-irgendwann">
          <span>Irgendwann reisen.</span>
          <span>Irgendwann auswandern.</span>
          <span>Irgendwann etwas Neues anfangen.</span>
          <span>Irgendwann mutiger sein.</span>
          <span>Irgendwann mehr nach dem eigenen Bauchgefühl leben.</span>
        </p>

        <div className="ab-lesen glas-flaeche">
          <p>Genau darum geht es in meinem Podcast „Das Leben ist zu kurz für irgendwann“.</p>
          <p>
            Ich nehme dich mit auf unseren Weg als Familie raus aus Deutschland und rein in ein neues Leben in Thailand. Aber hier geht es nicht nur um Palmen, Meer und Auswandern. Es
            geht auch um all das, was vorher passiert: Zweifel, Bürokratie, Schulpflicht, Online-Business, Visum, Krankenversicherung, Haushaltsauflösung, große Träume, kleine
            Nervenzusammenbrüche und diese Frage, die immer wieder auftaucht: Machen wir das wirklich?
          </p>
        </div>

        <Streifen fotos={STREIFEN_1} />

        <div className="ab-lesen glas-flaeche">
          <p>
            Ich erzähle ehrlich, locker und ohne Hochglanzfilter von unserem Alltag, unseren Entscheidungen, Umwegen und Aha-Momenten.
            <br />
            Dieser Podcast ist für dich, wenn du auch manchmal spürst, dass da noch mehr gehen könnte. Wenn du einen Traum hast, den du ständig auf später verschiebst. Oder wenn du
            einfach neugierig bist, wie es wirklich ist, als Familie ein neues Leben zu starten.
          </p>
          <p>Du findest den Podcast auch auf allen gängigen Plattformen (siehe unten) und auf YouTube.</p>
        </div>

        <Streifen fotos={STREIFEN_2} />

        <section className="ab-anhoeren glas-flaeche" aria-labelledby="ab-anhoeren-titel">
          <h2 id="ab-anhoeren-titel" className="ab-anhoeren-titel">
            Anhören auf
          </h2>
          <ul className="ab-plattformen">
            {plattformen.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener" aria-label={p.name} title={p.name} className="kipp kipp-dezent flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface/80 hover:bg-surface">
                  <PlattformLogo p={p} groesse={26} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <PolaroidNeigung />
    </>
  );
}
