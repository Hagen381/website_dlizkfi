// Läuft vor "next build" (und vor "next dev"), live und in der Vorschau.
//
// Fotos der Polaroid-Collage auf der Startseite: content/startseite/bilder/
// werden ohne Metadaten (kein EXIF/GPS/XMP/IPTC) neu kodiert nach
// public/images/startseite/. Dort macht next-image-export-optimizer die
// WEBP-Größen. public/images/startseite/ ist Build-Ergebnis (.gitignore).
// Prüft außerdem content/startseite/collage.json: jedes Foto vorhanden,
// 900×900, genau 8 Mobil-Fotos mit "mobil_reihenfolge" 1–8.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quellOrdner = path.join(wurzel, "content/startseite/bilder");
const layoutDatei = path.join(wurzel, "content/startseite/collage.json");
const zielOrdner = path.join(wurzel, "public/images/startseite");

fs.rmSync(zielOrdner, { recursive: true, force: true });
fs.mkdirSync(zielOrdner, { recursive: true });

const { polaroids } = JSON.parse(fs.readFileSync(layoutDatei, "utf8"));
const fehler = [];
for (const p of polaroids) {
  const quelle = path.join(quellOrdner, p.datei);
  if (!fs.existsSync(quelle)) {
    fehler.push(`Bild fehlt: content/startseite/bilder/${p.datei}`);
    continue;
  }
  const info = await sharp(quelle).rotate().jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(zielOrdner, p.datei));
  if (info.width !== 900 || info.height !== 900) fehler.push(`${p.datei}: ${info.width}×${info.height} statt 900×900`);
}
const mobil = polaroids.filter((p) => p.mobil).map((p) => p.mobil_reihenfolge).sort((a, b) => a - b);
if (mobil.join() !== "1,2,3,4,5,6,7,8") fehler.push(`collage.json: genau 8 Fotos mit "mobil": true und "mobil_reihenfolge" 1–8 erwartet, gefunden: ${mobil.join(", ") || "keine"}`);
if (fehler.length) {
  console.error("Startseiten-Bilder FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}

// Hash-Cache des Bildoptimierers (landet im Export): Einträge für Bilder, die
// es unter public/images/ nicht mehr gibt (umbenannt, gelöscht, frühere
// Entwürfe), entfernen. Läuft nach blog-bilder.mjs, alle Bilder liegen also
// schon bereit.
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
console.log(`Startseiten-Bilder: ${polaroids.length} Polaroid(s) ohne Metadaten vorbereitet.`);
