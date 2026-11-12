// Läuft vor "next build" (und vor "next dev"), live und in der Vorschau.
//
// Folgenbilder: content/folgen-bilder/<slug>.jpg (je Folge ein eigenes Foto,
// 900×900) werden ohne Metadaten (kein EXIF/GPS/XMP/IPTC) neu kodiert nach
// public/images/folgen/. Dort macht next-image-export-optimizer die
// WEBP-Größen. public/images/folgen/ ist Build-Ergebnis (.gitignore).
//
// Abbruch, wenn ein Bild nicht 900×900 ist oder sein Dateiname kein Slug aus
// content/folgen.json ist (Tippfehler im Namen fiele sonst nie auf).
// Kein Abbruch bei einer Folge ohne Bild (neue Folge vom Montagslauf): Die
// Karten nehmen dann das Kartenbild des Blogartikels oder ein Collage-Foto
// (src/lib/folgen-foto.ts). Folgen, die auf das Collage-Foto zurückfallen,
// stehen als Hinweis „Neue Folge ohne Folgenbild: <slug>“ im Build-Log (als
// GitHub-Warnung) und — im Actions-Lauf — in der Zusammenfassung des Laufs.
// Räumt außerdem verwaiste Einträge im Hash-Cache des Bildoptimierers auf.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quellOrdner = path.join(wurzel, "content/folgen-bilder");
const zielOrdner = path.join(wurzel, "public/images/folgen");
const vorschau = Boolean(process.env.NEXT_BUILD_BASE_PATH);

fs.rmSync(zielOrdner, { recursive: true, force: true });
fs.mkdirSync(zielOrdner, { recursive: true });

const { folgen } = JSON.parse(fs.readFileSync(path.join(wurzel, "content/folgen.json"), "utf8"));
const slugs = new Set(folgen.map((f) => f.slug));
const dateien = fs.existsSync(quellOrdner) ? fs.readdirSync(quellOrdner).filter((d) => !d.startsWith(".") && d !== "quellen.json" && d !== "README.md") : [];

const fehler = [];
const mitBild = new Set();
for (const datei of dateien.sort()) {
  const m = /^([a-z0-9][a-z0-9-]*)\.jpg$/.exec(datei);
  if (!m) { fehler.push(`content/folgen-bilder/${datei}: erwartet <slug>.jpg (Kleinbuchstaben, Ziffern, „-“)`); continue; }
  if (!slugs.has(m[1])) { fehler.push(`content/folgen-bilder/${datei}: „${m[1]}“ ist kein Slug aus content/folgen.json`); continue; }
  // .rotate() ohne Argument dreht nach EXIF-Ausrichtung; toFile schreibt ohne Metadaten
  const info = await sharp(path.join(quellOrdner, datei)).rotate().jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(zielOrdner, datei));
  if (info.width !== 900 || info.height !== 900) { fehler.push(`content/folgen-bilder/${datei}: ${info.width}×${info.height} statt 900×900`); continue; }
  mitBild.add(m[1]);
}
if (fehler.length) {
  console.error("Folgenbilder FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}

// Folgen ohne eigenes Bild: Rückfall Blog-Kartenbild, sonst Collage-Foto.
// Ein Artikel zählt, wenn er auf die Folge zeigt und mindestens ein Bild hat
// (Entwürfe mit „_“ nur in der Vorschau — wie in src/lib/blog.ts).
const blogOrdner = path.join(wurzel, "content/blog");
const mitArtikelbild = new Set();
for (const d of fs.existsSync(blogOrdner) ? fs.readdirSync(blogOrdner) : []) {
  if (!d.endsWith(".md") || d === "README.md" || (d.startsWith("_") && !vorschau)) continue;
  const text = fs.readFileSync(path.join(blogOrdner, d), "utf8");
  const slug = /^folge-slug:\s*["']?([^"'\s]+)["']?\s*$/m.exec(text)?.[1];
  if (slug && /!\[[^\]]*\]\(bilder\//.test(text)) mitArtikelbild.add(slug);
}
const ohne = folgen.map((f) => f.slug).filter((s) => !mitBild.has(s) && !mitArtikelbild.has(s));
for (const s of ohne) console.log(`::warning::Neue Folge ohne Folgenbild: ${s} (Karte zeigt ein Collage-Foto; Bild als content/folgen-bilder/${s}.jpg nachreichen)`);
if (ohne.length && process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### ⚠️ Folgen ohne Folgenbild\n\n${ohne.map((s) => `- Neue Folge ohne Folgenbild: \`${s}\` (Rückfall auf Collage-Foto)`).join("\n")}\n`);
}

// Hash-Cache des Bildoptimierers: Einträge für Bilder, die es unter
// public/images/ nicht mehr gibt, entfernen (wie startseite-bilder.mjs).
const hashDatei = path.join(wurzel, "public/images/next-image-export-optimizer-hashes.json");
if (fs.existsSync(hashDatei)) {
  const hashes = JSON.parse(fs.readFileSync(hashDatei, "utf8"));
  const rest = Object.fromEntries(Object.entries(hashes).filter(([k]) => fs.existsSync(path.join(wurzel, "public/images", k))));
  const weg = Object.keys(hashes).length - Object.keys(rest).length;
  if (weg) {
    fs.writeFileSync(hashDatei, JSON.stringify(rest, null, 4));
    console.log(`Bild-Hash-Cache: ${weg} verwaiste(n) Eintrag/Einträge entfernt.`);
  }
}
console.log(`Folgenbilder: ${mitBild.size} von ${folgen.length} Folgen mit eigenem Foto ohne Metadaten vorbereitet, ${mitArtikelbild.size} mit Blog-Kartenbild, ${ohne.length} mit Collage-Foto.`);
