// Läuft vor jedem Build (npm run build). Bricht ab, wenn eine alte
// PodView-Folgenadresse (content/alte-adressen.json) in content/folgen.json
// fehlt, ein Slug doppelt vorkommt oder nicht der Slug-Form entspricht.
//
// Mit --export prüft es zusätzlich, ob out/episodes/<slug>/index.html für
// jede alte Adresse existiert (Deploy-Sicherheitsprüfung).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (d) => JSON.parse(fs.readFileSync(path.join(wurzel, d), "utf8"));

const alte = lies("content/alte-adressen.json").folgen.map((a) => a.slug);
const folgen = lies("content/folgen.json").folgen;
const slugs = folgen.map((f) => f.slug);

const fehler = [];
const doppelt = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (doppelt.length) fehler.push(`Doppelte Slugs: ${[...new Set(doppelt)].join(", ")}`);
const kaputt = slugs.filter((s) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || ""));
if (kaputt.length) fehler.push(`Ungültige Slugs: ${kaputt.join(", ")}`);
const fehlend = alte.filter((s) => !slugs.includes(s));
if (fehlend.length) fehler.push(`Alte Adressen ohne Folge in folgen.json:\n  /episodes/${fehlend.join("/\n  /episodes/")}/`);

if (process.argv.includes("--export")) {
  const ohneDatei = alte.filter((s) => !fs.existsSync(path.join(wurzel, "out/episodes", s, "index.html")));
  if (ohneDatei.length) fehler.push(`Im Export fehlen:\n  out/episodes/${ohneDatei.join("/index.html\n  out/episodes/")}/index.html`);
}

if (fehler.length) {
  console.error("Adressprüfung FEHLGESCHLAGEN:\n" + fehler.join("\n"));
  process.exit(1);
}
console.log(`Adressprüfung ok: ${alte.length} alte Folgen-Adressen vorhanden, ${slugs.length} Folgen gesamt${process.argv.includes("--export") ? ", alle im Export" : ""}.`);
