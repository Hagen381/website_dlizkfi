// Prüft den Export: Kein Bild (JPG/PNG/WEBP/GIF/AVIF) darf EXIF-, XMP- oder
// IPTC-Metadaten enthalten (Kamera, Datum, GPS-Ort …). Läuft in Vorschau- und
// Live-Workflow nach dem Build; bricht mit Fehler ab, wenn etwas gefunden wird.
//
// Aufruf: node scripts/metadaten-pruefen.mjs [ordner=out]

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ordner = path.resolve(process.argv[2] || "out");
const endungen = /\.(jpe?g|png|webp|gif|avif)$/i;

function* bilder(o) {
  for (const e of fs.readdirSync(o, { withFileTypes: true })) {
    const p = path.join(o, e.name);
    if (e.isDirectory()) yield* bilder(p);
    else if (endungen.test(e.name)) yield p;
  }
}

const funde = [];
let anzahl = 0;
for (const datei of bilder(ordner)) {
  anzahl++;
  const m = await sharp(datei).metadata();
  const arten = [m.exif && "EXIF", m.xmp && "XMP", m.iptc && "IPTC"].filter(Boolean);
  if (arten.length) funde.push(`${path.relative(process.cwd(), datei)}: ${arten.join(", ")}`);
}

if (funde.length) {
  console.error(`Metadaten-Prüfung FEHLGESCHLAGEN: ${funde.length} von ${anzahl} Bildern enthalten Metadaten:\n  ` + funde.join("\n  "));
  process.exit(1);
}
console.log(`Metadaten-Prüfung ok: ${anzahl} Bilder, keines mit EXIF/XMP/IPTC.`);
