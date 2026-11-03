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
// public/images/blog/ und src/generated/ sind Build-Ergebnisse (.gitignore).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

if (fehler.length) {
  console.error("Blog-Bilder FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}
fs.writeFileSync(manifestDatei, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Blog-Bilder: ${Object.keys(manifest).length} Bild(er) ohne Metadaten vorbereitet.`);
