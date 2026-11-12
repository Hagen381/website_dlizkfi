import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import BlogKarussell from "@/components/BlogKarussell";
import GelberButton from "@/components/GelberButton";
import { Kopfhoerer } from "@/components/Icons";
import { artikel, datumLesbar } from "@/lib/blog";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

// Blogübersicht als 3D-Karussell (live seit 12.11.2026, vorher Entwurf
// /entwurf/blog/). Stile: ./karussell.css (beim Build ohne Kommentare inline
// eingebettet) und ./karussell-ohne-js.css (nur in <noscript>: einfache
// Kartenliste statt Ring). Alle Artikel-Links stehen im ausgelieferten HTML.

function cssLesen(datei: string) {
  return fs
    .readFileSync(path.join(process.cwd(), "src/app/blog", datei), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n\s*\n/g, "\n");
}
const karussellCss = cssLesen("karussell.css");
const ohneJsCss = cssLesen("karussell-ohne-js.css");

export const metadata: Metadata = {
  title: "Blog",
  description: `Artikel zu den Folgen von „${siteConfig.name}“: Auswandern, Familie und das Leben auf Koh Samui.`,
  alternates: { canonical: "/blog/" },
};

// Lesezeit aus der Wortzahl des Artikeltexts (ohne Bilder/Bildunterschriften),
// 200 Wörter pro Minute, aufgerundet.
function lesezeit(bloecke: (typeof artikel)[number]["bloecke"]) {
  const text = bloecke
    .map((b) => (b.art === "html" ? b.html : ""))
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  const woerter = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return woerter > 0 ? Math.ceil(woerter / 200) : null;
}

// Polaroids links/rechts (nur ≥ 1280 px, Deko): Datei, Seite, Abstand zum Rand, oben, Drehung
const POLAROIDS: [string, "links" | "rechts", number, number, number][] = [
  ["20251006_181734.jpg", "links", 18, 20, -7],
  ["20251013_114024.jpg", "links", 100, 230, 5],
  ["20261003_124935.jpg", "links", 22, 450, -4],
  ["20251116_180922.jpg", "links", 96, 640, 6],
  ["20251118_165504.jpg", "rechts", 20, 10, 6],
  ["20260926_084325.jpg", "rechts", 100, 220, -5],
  ["20251116_153451.jpg", "rechts", 16, 450, 4],
  ["20250919_150203.jpg", "rechts", 96, 640, -6],
];

// Neueste Folge zuerst (Reihenfolge aus src/lib/blog.ts). Live nur
// veröffentlichte Artikel; in der Vorschau auch Entwürfe („_“) mit Hinweis.
// Solange es keine veröffentlichten Artikel gibt, ist /blog/ weder in der
// Navigation noch in der Sitemap (hatBlog in src/lib/blog.ts).
export default function Blog() {
  const karten = artikel.map((a, i) => (
    <Link key={a.slug} href={`/blog/${a.slug}/`} className="kar-karte" draggable={false}>
      {a.kartenbild ? (
        <BlogBildRoh bild={{ src: a.kartenbild.src, alt: "", width: 300, height: 420 }} priority={i === 0} className="kar-bild" style={{ objectPosition: a.kartenbildPosition }} />
      ) : (
        <span className="kar-bild kar-bild-leer" />
      )}
      {i % 2 === 0 && <span className="kar-klebestreifen" aria-hidden="true" />}
      <span className="kar-schild">
        <span className="kar-datum">
          <time dateTime={a.datum}>{datumLesbar(a.datum)}</time>
          {a.entwurf && <span className="kar-marke">Entwurf</span>}
        </span>
        <span className="kar-titel">{a.titel.split(":")[0]}</span>
      </span>
    </Link>
  ));

  const infos = artikel.map((a) => {
    const minuten = lesezeit(a.bloecke);
    return (
      <div key={a.slug}>
        <p className="kar-info-meta">
          <time dateTime={a.datum}>{datumLesbar(a.datum)}</time>
          {minuten && <> · {minuten} Min. Lesezeit</>}
          {a.entwurf && <span className="kar-marke">Entwurf</span>}
        </p>
        <h2 className="kar-info-titel">{a.titel}</h2>
        <p className="kar-info-text">{a.beschreibung}</p>
        <div className="kar-info-knoepfe">
          <GelberButton href={`/blog/${a.slug}/`} icon={null}>
            Weiterlesen
            {/* Aussagekräftiger Linktext (Lighthouse „link-text“, Screenreader) */}
            <span className="sr-only">: {a.titel}</span>
          </GelberButton>
          <Link href={`/episodes/${a.folgeSlug}/`} className="kipp kipp-dezent kar-knopf-weiss">
            <Kopfhoerer className="h-5 w-5" />
            Zur Podcastfolge
          </Link>
        </div>
      </div>
    );
  });

  return (
    <>
      <style href="blog-karussell" precedence="default">
        {karussellCss}
      </style>
      <noscript>
        <style>{ohneJsCss}</style>
      </noscript>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Blog", pfad: "/blog/" }])] }} />

      <div className="kar-buehne">
        <div className="kar-seitenfotos" aria-hidden="true">
          {POLAROIDS.map(([datei, seite, x, y, r]) => (
            <div key={datei} className="kar-pola" style={{ [seite === "links" ? "left" : "right"]: `${x}px`, top: `${y}px`, ["--r" as string]: `${r}deg` } as CSSProperties}>
              <div className="kar-pola-rahmen">
                <BlogBildRoh bild={{ src: `/images/startseite/${datei}`, alt: "", width: 150, height: 150 }} className="kar-pola-bild" />
              </div>
            </div>
          ))}
        </div>

        <header className="kar-kopf glas-flaeche">
          <h1 className="kar-kopf-titel">Blog</h1>
          <p className="kar-kopf-text">Geschichten und Gedanken zu den Folgen – zum Lesen statt Hören.</p>
        </header>

        {artikel.length === 0 ? (
          <p className="kar-hinweis">Hier erscheinen bald Artikel zu den Folgen.</p>
        ) : (
          <BlogKarussell titel={artikel.map((a) => a.titel)} infos={infos}>
            {karten}
          </BlogKarussell>
        )}
      </div>
    </>
  );
}
