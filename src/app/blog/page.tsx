import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import BlogBlaettern from "@/components/BlogBlaettern";
import { artikel, datumLesbar } from "@/lib/blog";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

// Blogübersicht als Kachel-Raster (seit 12.11.2026, vorher 3D-Karussell):
// 6 Artikel pro Seite (ab 1024 px 3 × 2, 640–1023 px 2 Spalten, darunter 1),
// Blättern mit ← „1 / 2“ → (src/components/BlogBlaettern.tsx, ?seite=N).
// Stile: ./blog.css (beim Build ohne Kommentare inline eingebettet) und
// ./blog-ohne-js.css (nur in <noscript>: alle Kacheln, kein Blättern). Alle
// Artikel-Links stehen im ausgelieferten HTML.

function cssLesen(datei: string) {
  return fs
    .readFileSync(path.join(process.cwd(), "src/app/blog", datei), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n\s*\n/g, "\n");
}
const blogCss = cssLesen("blog.css");
const ohneJsCss = cssLesen("blog-ohne-js.css");

const PRO_SEITE = 6;

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

// Polaroids links/rechts (Deko, aria-hidden): Quelle, Datei, Seite, Lage,
// Abstand zum Rand, oben, Drehung. Quelle „startseite“ = content/startseite/
// bilder/<datei>, „folgen“ = content/folgen-bilder/<slug>.jpg. Lage „aussen“
// ab 1280 px, „innen“ erst ab 1440 px (darunter ausgeblendet und nicht
// geladen — sonst würden die Kacheln zu schmal, blog.css).
// Kein Polaroid darf dasselbe Foto zeigen wie ein Kartenbild auf /blog/
// (Prüfung unten, Build-Abbruch).
type Polaroid = ["startseite" | "folgen", string, "links" | "rechts", "aussen" | "innen", number, number, number];
const POLAROIDS: Polaroid[] = [
  ["startseite", "20251019_161345.jpg", "links", "aussen", 18, 20, -7],
  ["startseite", "20251013_114024.jpg", "links", "innen", 100, 230, 5],
  ["startseite", "20261003_124935.jpg", "links", "aussen", 22, 450, -4],
  ["startseite", "20251116_180922.jpg", "links", "innen", 96, 640, 6],
  ["startseite", "20251118_165504.jpg", "rechts", "aussen", 20, 10, 6],
  ["startseite", "20261003_174804.jpg", "rechts", "innen", 100, 220, -5],
  ["startseite", "20251116_153451.jpg", "rechts", "aussen", 16, 450, 4],
  ["startseite", "20250919_150203.jpg", "rechts", "innen", 96, 640, -6],
];

// Ursprüngliche Kamera-Datei eines Polaroids (Folgenbilder heißen nach dem
// Slug, ihre Herkunft steht in content/folgen-bilder/quellen.json).
const folgenQuellen: Record<string, string> = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/folgen-bilder/quellen.json"), "utf8"));
const polaroidSrc = ([quelle, datei]: Polaroid) => (quelle === "folgen" ? `/images/folgen/${datei}` : `/images/startseite/${datei}`);
const polaroidFoto = ([quelle, datei]: Polaroid) => (quelle === "folgen" ? (folgenQuellen[datei.replace(/\.jpg$/, "")] ?? datei) : datei);
const kartenFotos = new Set(artikel.flatMap((a) => (a.kartenbild ? [a.kartenbild.src.split("/").pop()!] : [])));
const doppelt = POLAROIDS.filter((p) => kartenFotos.has(polaroidFoto(p)));
if (doppelt.length) {
  throw new Error(`/blog/: Polaroid zeigt dasselbe Foto wie ein Kartenbild: ${doppelt.map((p) => polaroidFoto(p)).join(", ")} — anderes Foto in POLAROIDS (src/app/blog/page.tsx) wählen.`);
}
for (const p of POLAROIDS) {
  const pfad = p[0] === "folgen" ? `content/folgen-bilder/${p[1]}` : `content/startseite/bilder/${p[1]}`;
  if (!fs.existsSync(path.join(process.cwd(), pfad))) throw new Error(`/blog/: Polaroid-Foto fehlt: ${pfad}`);
}

// Neueste Folge zuerst (Reihenfolge aus src/lib/blog.ts). Live nur
// veröffentlichte Artikel; in der Vorschau auch Entwürfe („_“) mit Marke.
// Solange es keine veröffentlichten Artikel gibt, ist /blog/ weder in der
// Navigation noch in der Sitemap (hatBlog in src/lib/blog.ts).
export default function Blog() {
  const seiten = Math.max(1, Math.ceil(artikel.length / PRO_SEITE));
  // Je Seite: Kacheln der Seite 1 aus-, die der Seite N einblenden, wenn
  // <html data-blog-seite="N"> gesetzt ist (siehe BlogBlaettern.tsx).
  const seitenCss = Array.from({ length: seiten - 1 }, (_, k) => k + 2)
    .map((n) => `html[data-blog-seite="${n}"] .br-platz[data-seite="1"]{display:none}html[data-blog-seite="${n}"] .br-platz[data-seite="${n}"]{display:block}`)
    .join("");
  // Läuft vor dem Zeichnen des Rasters: ?seite=N sofort anwenden (CLS 0)
  const seitenSkript = `try{var s=Number(new URLSearchParams(location.search).get("seite"));if(s>1&&s<=${seiten}&&s%1===0)document.documentElement.dataset.blogSeite=s}catch(e){}`;

  return (
    <>
      <style href="blog-raster" precedence="default">
        {blogCss + seitenCss}
      </style>
      <noscript>
        <style>{ohneJsCss}</style>
      </noscript>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Blog", pfad: "/blog/" }])] }} />

      <div className="br-buehne">
        <div className="br-seitenfotos" aria-hidden="true">
          {POLAROIDS.map((p) => (
            <div key={p[1]} className={`br-pola ${p[3]}`} style={{ [p[2] === "links" ? "left" : "right"]: `${p[4]}px`, top: `${p[5]}px`, ["--r" as string]: `${p[6]}deg` } as CSSProperties}>
              <div className="br-pola-rahmen">
                <BlogBildRoh bild={{ src: polaroidSrc(p), alt: "", width: 150, height: 150 }} className="br-pola-bild" />
              </div>
            </div>
          ))}
        </div>

        <header className="br-kopf glas-flaeche">
          <h1 className="br-kopf-titel">Blog</h1>
          <p className="br-kopf-text">Geschichten und Gedanken zu den Folgen – zum Lesen statt Hören.</p>
        </header>

        {artikel.length === 0 ? (
          <p className="br-hinweis">Hier erscheinen bald Artikel zu den Folgen.</p>
        ) : (
          <section className="br-bereich" aria-label="Blogartikel">
            {seiten > 1 && <script dangerouslySetInnerHTML={{ __html: seitenSkript }} />}
            <ol className="br-raster">
              {artikel.map((a, i) => {
                const minuten = lesezeit(a.bloecke);
                return (
                  <li key={a.slug} className="br-platz" data-seite={Math.floor(i / PRO_SEITE) + 1}>
                    <article className="kipp kipp-karte br-kachel">
                      <Link href={`/blog/${a.slug}/`} className="br-link">
                        <span className="br-bild-rahmen">
                          {a.kartenbild && (
                            <BlogBildRoh
                              bild={{ src: a.kartenbild.src, alt: "", width: 640, height: 480 }}
                              // Kachelbreite je Stufe (blog.css): 1 Spalte = Breite − 32 px,
                              // 2 Spalten, 3 Spalten (ab 1280 px neben den Polaroids)
                              sizes="(min-width: 1440px) calc(33vw - 196px), (min-width: 1280px) calc(33vw - 150px), (min-width: 1024px) calc(33vw - 27px), (min-width: 640px) calc(50vw - 28px), calc(100vw - 32px)"
                              // Vorderste Kachel = LCP: nicht lazy, fetchpriority="high"
                              wichtig={i === 0}
                              className="kipp-bild br-bild"
                              style={{ objectPosition: a.kartenbildPosition }}
                            />
                          )}
                        </span>
                        <span className="br-text">
                          <span className="br-meta">
                            <time dateTime={a.datum}>{datumLesbar(a.datum)}</time>
                            {minuten && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{minuten} Min. Lesezeit</span>
                              </>
                            )}
                            {a.entwurf && <span className="br-marke">Entwurf</span>}
                          </span>
                          <h2 className="br-titel">{a.titel}</h2>
                          <span className="br-beschreibung">{a.beschreibung}</span>
                          <span className="br-weiter">
                            Weiterlesen <span aria-hidden="true">→</span>
                          </span>
                        </span>
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ol>
            {seiten > 1 && <BlogBlaettern seiten={seiten} />}
          </section>
        )}
      </div>
    </>
  );
}
