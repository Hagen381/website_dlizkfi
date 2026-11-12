// Läuft vor "next build" (und vor "next dev"), live UND in der Vorschau —
// damit der spätere Livegang der Über-Seite nichts mehr vorbereiten muss.
//
// Fotos der Über-Seite: content/ueber/bilder/ (18 Fotos, 900×900, auf Kinder
// geprüft) werden ohne Metadaten (kein EXIF/GPS/XMP/IPTC) neu kodiert nach
// public/images/ueber/. Dort macht next-image-export-optimizer die
// WEBP-Größen. public/images/ueber/ ist Build-Ergebnis (.gitignore).
// Bricht ab, wenn ein Foto nicht 900×900 ist. Muss VOR
// scripts/startseite-bilder.mjs laufen (dessen Aufräumen des Hash-Caches
// erwartet alle Bilder unter public/images/).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quellOrdner = path.join(wurzel, "content/ueber/bilder");
const zielOrdner = path.join(wurzel, "public/images/ueber");

fs.rmSync(zielOrdner, { recursive: true, force: true });
fs.mkdirSync(zielOrdner, { recursive: true });

const dateien = fs.existsSync(quellOrdner) ? fs.readdirSync(quellOrdner).filter((d) => /\.jpe?g$/i.test(d)).sort() : [];
const fehler = [];
for (const datei of dateien) {
  const info = await sharp(path.join(quellOrdner, datei)).rotate().jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(zielOrdner, datei));
  if (info.width !== 900 || info.height !== 900) fehler.push(`${datei}: ${info.width}×${info.height} statt 900×900`);
}
if (fehler.length) {
  console.error("Über-Bilder FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}
console.log(`Über-Bilder: ${dateien.length} Foto(s) ohne Metadaten vorbereitet.`);
