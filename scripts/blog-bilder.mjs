// Läuft vor "next build" (und vor "next dev").
//
// Für jeden Blogartikel in content/blog/*.md (Entwürfe mit "_" nur in der Vorschau):
//   1. Jedes Bild ![…](bilder/<slug>/datei.jpg) muss existieren — sonst Abbruch.
//   2. Das Bild wird OHNE Metadaten (kein EXIF/GPS/XMP/IPTC) neu kodiert nach
//      public/images/blog/<slug>/datei.jpg. Dort optimiert es
//      next-image-export-optimizer wie alle anderen Bilder (WEBP-Größen).
//      Die Ausrichtung aus EXIF wird vorher angewendet (rotate()).
//   3. Breite/Höhe landen in src/generated/blog-bilder.json (für width/height
//      der <img>-Tags, verhindert Layout-Springen).
//   4. Kartenausschnitt für /blog/: das Kartenbild (Frontmatter `kartenbild`,
//      sonst das erste Bild) zugeschnitten auf 4:3 an `kartenbild-position`
//      (wie object-position), höchstens 1200 px breit, als
//      public/images/blog/<slug>/<name>.karte.jpg — die Kachel lädt nur noch
//      den sichtbaren Ausschnitt statt des ganzen (oft hochformatigen) Fotos
//      (LCP mobil). Manifest-Schlüssel "karten/<slug>".
// public/images/blog/ und src/generated/ sind Build-Ergebnisse (.gitignore).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import sharp from "sharp";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogOrdner = path.join(wurzel, "content/blog");
const zielOrdner = path.join(wurzel, "public/images/blog");
const manifestDatei = path.join(wurzel, "src/generated/blog-bilder.json");

const BILD = /!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g;

fs.rmSync(zielOrdner, { recursive: true, force: true });
fs.mkdirSync(zielOrdner, { recursive: true });
fs.mkdirSync(path.dirname(manifestDatei), { recursive: true });

const fehler = [];
const manifest = {};
// Entwürfe ("_…") nur im Vorschau-Build (NEXT_BUILD_BASE_PATH gesetzt). Im
// Live-Build landen ihre Bilder NICHT im Export, solange der Artikel nicht
// veröffentlicht ist.
const vorschau = Boolean(process.env.NEXT_BUILD_BASE_PATH);
const dateien = fs.existsSync(blogOrdner)
  ? fs.readdirSync(blogOrdner).filter((d) => d.endsWith(".md") && d.toLowerCase() !== "readme.md" && (vorschau || !d.startsWith("_")))
  : [];

for (const datei of dateien) {
  const text = fs.readFileSync(path.join(blogOrdner, datei), "utf8");
  for (const [, alt, src] of text.matchAll(BILD)) {
    if (/^https?:/i.test(src)) {
      fehler.push(`${datei}: externes Bild nicht erlaubt (${src}) — Bilder gehören nach content/blog/bilder/`);
      continue;
    }
    const rel = src.replace(/^\.?\//, "");
    if (!rel.startsWith("bilder/")) {
      fehler.push(`${datei}: Bildpfad muss mit bilder/ beginnen: ${src}`);
      continue;
    }
    if (!alt.trim()) fehler.push(`${datei}: Bild ohne Bildunterschrift/alt-Text: ${src}`);
    const quelle = path.join(blogOrdner, rel);
    if (!fs.existsSync(quelle)) {
      fehler.push(`${datei}: Bild fehlt: content/blog/${rel}`);
      continue;
    }
    if (manifest[rel]) continue;
    const ziel = path.join(zielOrdner, rel.replace(/^bilder\//, ""));
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    // Neu kodieren ohne Metadaten (sharp übernimmt Metadaten nur mit withMetadata()).
    const info = await sharp(quelle).rotate().jpeg({ quality: 86, mozjpeg: true }).toFile(ziel);
    manifest[rel] = { width: info.width, height: info.height, pfad: `/images/blog/${rel.replace(/^bilder\//, "")}` };
  }
}

// 4. Kartenausschnitt 4:3 je Artikel (Regeln für kartenbild/-position wie in
//    src/lib/blog.ts; Fehler dort meldet der Build ausführlich).
for (const datei of dateien) {
  const { data, content } = matter(fs.readFileSync(path.join(blogOrdner, datei), "utf8"));
  const bilder = [...content.matchAll(BILD)].map(([, , src]) => src.replace(/^\.?\//, "")).filter((rel) => manifest[rel]);
  const rel = data.kartenbild ? bilder.find((r) => r.split("/").pop() === String(data.kartenbild).trim()) : bilder[0];
  if (!rel) continue;
  const pos = String(data["kartenbild-position"] ?? "50% 50%").match(/^(\d{1,3})% (\d{1,3})%$/);
  const [px, py] = pos ? [Number(pos[1]) / 100, Number(pos[2]) / 100] : [0.5, 0.5];
  const quelle = path.join(zielOrdner, rel.replace(/^bilder\//, ""));
  const { width: w, height: h } = manifest[rel];
  // Ausschnitt wie object-fit: cover + object-position in einem 4:3-Rahmen
  const breit = w / h > 4 / 3;
  const cw = breit ? Math.round((h * 4) / 3) : w;
  const ch = breit ? h : Math.round((w * 3) / 4);
  const left = Math.round((w - cw) * px);
  const top = Math.round((h - ch) * py);
  const slug = datei.replace(/^_/, "").replace(/\.md$/, "");
  const name = rel.split("/").pop().replace(/\.jpe?g$/i, "");
  const zielRel = `${slug}/${name}.karte.jpg`;
  const info = await sharp(quelle)
    .extract({ left, top, width: cw, height: ch })
    .resize({ width: Math.min(cw, 1200), withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(zielOrdner, zielRel));
  manifest[`karten/${slug}`] = { width: info.width, height: info.height, pfad: `/images/blog/${zielRel}` };
}

if (fehler.length) {
  console.error("Blog-Bilder FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}
fs.writeFileSync(manifestDatei, JSON.stringify(manifest, null, 2) + "\n");
const nKarten = Object.keys(manifest).filter((k) => k.startsWith("karten/")).length;
console.log(`Blog-Bilder: ${Object.keys(manifest).length - nKarten} Bild(er) ohne Metadaten vorbereitet, ${nKarten} Kartenausschnitt(e) 4:3.`);
