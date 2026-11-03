// Prüft den Vorschau-Export (GitHub Pages, basePath z. B. /website_dlizkfi):
// Jede src-, srcset- und url(...)-Angabe, die mit "/" beginnt, muss mit dem
// basePath anfangen — sonst landet das Bild auf hagen381.github.io/… (404).
//
// Geprüft werden HTML, CSS und die RSC-Dateien (.txt) von Next.js, aus denen
// beim Klicken innerhalb der Seite gerendert wird.
//
// Aufruf: node scripts/vorschau-pfade-pruefen.mjs /website_dlizkfi

import fs from "node:fs";
import path from "node:path";

const basis = process.argv[2] || process.env.NEXT_BUILD_BASE_PATH;
if (!basis || !basis.startsWith("/")) {
  console.error("basePath fehlt (z. B. /website_dlizkfi).");
  process.exit(2);
}
const out = path.resolve("out");

function* dateien(ordner) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) yield* dateien(p);
    else if (/\.(html|css|txt)$/.test(e.name)) yield p;
  }
}

// Liefert alle Pfade, die eine Datei als src / srcset / url() angibt.
function pfade(inhalt) {
  const ergebnis = [];
  const muster = [
    // HTML-Attribute: src="…", srcset="…", srcSet="…", imagesrcset="…"
    /\b(?:src|srcset|srcSet|imageSrcSet|imagesrcset)\s*=\s*"([^"]*)"/g,
    /\b(?:src|srcset|srcSet|imageSrcSet|imagesrcset)\s*=\s*'([^']*)'/g,
    // RSC/JSON: "src":"…", "srcSet":"…"
    /\\?"(?:src|srcSet|srcset|imageSrcSet)\\?"\s*:\s*\\?"((?:[^"\\]|\\(?!"))*)\\?"/g,
    // CSS: url(…)
    /url\(\s*(['"]?)([^'")]*)\1\s*\)/g,
  ];
  for (const m of muster) {
    for (const t of inhalt.matchAll(m)) {
      const wert = t[t.length - 1];
      // srcset: "a.jpg 32w, b.jpg 64w" → einzelne URLs
      for (const teil of wert.split(",")) {
        const url = teil.trim().split(/\s+/)[0];
        if (url) ergebnis.push(url);
      }
    }
  }
  return ergebnis;
}

const fehler = [];
let geprueft = 0;
for (const datei of dateien(out)) {
  const inhalt = fs.readFileSync(datei, "utf8");
  for (const url of pfade(inhalt)) {
    if (!url.startsWith("/") || url.startsWith("//")) continue; // relativ, extern, data:
    geprueft++;
    if (!url.startsWith(`${basis}/`)) fehler.push(`${path.relative(process.cwd(), datei)}: ${url}`);
  }
}

if (fehler.length) {
  const eindeutig = [...new Set(fehler)];
  console.error(`Pfadprüfung FEHLGESCHLAGEN: ${eindeutig.length} Angaben ohne ${basis}/ (zeigen in der Vorschau ins Leere):`);
  for (const f of eindeutig.slice(0, 40)) console.error(`  ${f}`);
  if (eindeutig.length > 40) console.error(`  … und ${eindeutig.length - 40} weitere`);
  process.exit(1);
}
console.log(`Pfadprüfung ok: ${geprueft} Bild-/Dateipfade, alle beginnen mit ${basis}/.`);
