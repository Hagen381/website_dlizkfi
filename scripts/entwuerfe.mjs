// Läuft vor "next build" (und vor "next dev").
//
// Entwürfe nur in der Vorschau (z. B. /entwurf/startseite/, Startseite mit
// Polaroid-Collage). Die Seiten liegen unter src/entwuerfe/ — außerhalb von
// src/app, also ohne Route.
//
// Vorschau-Build (NEXT_BUILD_BASE_PATH gesetzt):
//   1. src/app/entwurf/<name>/page.tsx wird angelegt (nur ein Re-Export der
//      Seite aus src/entwuerfe/) → Route existiert.
//   2. Fotos aus content/startseite-entwurf/bilder/ werden ohne Metadaten neu
//      kodiert nach public/images/startseite-entwurf/ (WEBP-Größen macht dann
//      next-image-export-optimizer).
// Live-Build: beides wird gelöscht → keine Route, keine Bilder, live 404.
// src/app/entwurf/ und public/images/startseite-entwurf/ sind Build-Ergebnisse
// (.gitignore).
//
// Warum nicht pageExtensions ("page.vorschau.tsx")? Next sucht die
// Schrift-Preloads über den Dateinamen ohne letzte Endung ("page.vorschau")
// und findet sie dann nicht. Und generateStaticParams mit leerer Liste lässt
// Next beim Static Export nicht zu.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routenOrdner = path.join(wurzel, "src/app/entwurf");
const quellOrdner = path.join(wurzel, "content/startseite-entwurf/bilder");
const layoutDatei = path.join(wurzel, "content/startseite-entwurf/collage.json");
const zielOrdner = path.join(wurzel, "public/images/startseite-entwurf");

// Name der Route → Modul unter src/entwuerfe/
const entwuerfe = { startseite: "startseite/Seite" };

fs.rmSync(routenOrdner, { recursive: true, force: true });
fs.rmSync(zielOrdner, { recursive: true, force: true });

if (!process.env.NEXT_BUILD_BASE_PATH) {
  // Nach einem lokalen Vorschau-Build stünden die Entwurfsbilder noch im
  // Hash-Cache des Bildoptimierers (landet im Export) — dort entfernen.
  const hashDatei = path.join(wurzel, "public/images/next-image-export-optimizer-hashes.json");
  if (fs.existsSync(hashDatei)) {
    const hashes = JSON.parse(fs.readFileSync(hashDatei, "utf8"));
    const rest = Object.fromEntries(Object.entries(hashes).filter(([k]) => !k.includes("startseite-entwurf")));
    if (Object.keys(rest).length !== Object.keys(hashes).length) fs.writeFileSync(hashDatei, JSON.stringify(rest));
  }
  console.log("Entwürfe: Live-Build — keine Entwurfsseiten, keine Entwurfsbilder.");
  process.exit(0);
}

for (const [name, modul] of Object.entries(entwuerfe)) {
  const ordner = path.join(routenOrdner, name);
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(
    path.join(ordner, "page.tsx"),
    `// Erzeugt von scripts/entwuerfe.mjs — nur im Vorschau-Build, nicht bearbeiten.\nexport { default, metadata } from "@/entwuerfe/${modul}";\n`,
  );
}

const { polaroids } = JSON.parse(fs.readFileSync(layoutDatei, "utf8"));
fs.mkdirSync(zielOrdner, { recursive: true });
const fehler = [];
for (const p of polaroids) {
  const quelle = path.join(quellOrdner, p.datei);
  if (!fs.existsSync(quelle)) {
    fehler.push(`Bild fehlt: content/startseite-entwurf/bilder/${p.datei}`);
    continue;
  }
  const info = await sharp(quelle).rotate().jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(zielOrdner, p.datei));
  if (info.width !== 900 || info.height !== 900) fehler.push(`${p.datei}: ${info.width}×${info.height} statt 900×900`);
}
const mobil = polaroids.filter((p) => p.mobil).map((p) => p.mobil_reihenfolge).sort((a, b) => a - b);
if (mobil.join() !== "1,2,3,4,5,6,7,8") fehler.push(`collage.json: genau 8 Fotos mit "mobil": true und "mobil_reihenfolge" 1–8 erwartet, gefunden: ${mobil.join(", ") || "keine"}`);
if (fehler.length) {
  console.error("Entwürfe FEHLER:\n  " + fehler.join("\n  "));
  process.exit(1);
}
console.log(`Entwürfe (nur Vorschau): ${Object.keys(entwuerfe).map((n) => `/entwurf/${n}/`).join(", ")}; ${polaroids.length} Bild(er) ohne Metadaten vorbereitet.`);
