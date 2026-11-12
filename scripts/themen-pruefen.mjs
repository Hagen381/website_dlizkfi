// Prüft content/themen.json vor jedem Build (live und Vorschau) und vergibt
// für neue Folgen ohne Eintrag automatisch Themen.
//
// Aufbau von content/themen.json:
//   {
//     "themen": { "<key>": "<Label>", … },          // Reihenfolge = Reiter
//     "folgen": {
//       "<slug>": ["<key>", …],                        // geprüft (Projekt-Chat)
//       "<slug>": { "themen": ["<key>", …], "auto": true }  // automatisch vergeben
//     }
//   }
//
// Abbruch (Build rot): unbekannter Slug in "folgen", unbekanntes Thema, leere
// Themenliste, falsches Format.
// Kein Abbruch: Folge aus content/folgen.json ohne Eintrag (neue Folge im
// Montagslauf) → Themen per Stichwortregeln (scripts/themen-regeln.mjs) mit
// "auto": true eintragen und als Warnung „Themen automatisch vergeben: <slug>“
// melden (Build-Log + Zusammenfassung des Laufs, gelb). Auch schon
// automatisch vergebene, noch nicht geprüfte Einträge werden gemeldet.

import fs from "node:fs";
import path from "node:path";
import { themenVorschlag } from "./themen-regeln.mjs";

const datei = path.join(process.cwd(), "content/themen.json");
const daten = JSON.parse(fs.readFileSync(datei, "utf8"));
const folgen = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/folgen.json"), "utf8")).folgen;

const fehler = [];
if (!daten.themen || typeof daten.themen !== "object" || !daten.folgen || typeof daten.folgen !== "object") {
  console.error("content/themen.json: \"themen\" und \"folgen\" fehlen.");
  process.exit(1);
}
const themen = new Set(Object.keys(daten.themen));
for (const [key, label] of Object.entries(daten.themen)) {
  if (!/^[a-z][a-z0-9-]*$/.test(key)) fehler.push(`Thema-Schlüssel ungültig: ${key}`);
  if (typeof label !== "string" || !label.trim()) fehler.push(`Thema ${key} hat kein Label`);
}
const slugs = new Set(folgen.map((f) => f.slug));
for (const [slug, eintrag] of Object.entries(daten.folgen)) {
  const liste = Array.isArray(eintrag) ? eintrag : eintrag?.themen;
  if (!slugs.has(slug)) fehler.push(`Unbekannte Folge (kein Slug aus content/folgen.json): ${slug}`);
  if (!Array.isArray(liste) || !liste.length) {
    fehler.push(`Folge ${slug}: keine Themen`);
    continue;
  }
  if (!Array.isArray(eintrag) && eintrag.auto !== true) fehler.push(`Folge ${slug}: Objekt-Eintrag nur mit "auto": true`);
  for (const k of liste) if (!themen.has(k)) fehler.push(`Folge ${slug}: unbekanntes Thema „${k}“`);
  if (new Set(liste).size !== liste.length) fehler.push(`Folge ${slug}: Thema doppelt`);
}
if (fehler.length) {
  for (const f of fehler) console.error(`::error::themen.json: ${f}`);
  process.exit(1);
}

// Neue Folgen ohne Eintrag: automatisch vergeben
const neu = [];
for (const f of folgen) {
  if (daten.folgen[f.slug]) continue;
  daten.folgen[f.slug] = { themen: themenVorschlag(f.titel, f.shownotes ?? ""), auto: true };
  neu.push(f.slug);
}
if (neu.length) {
  // Reihenfolge wie folgen.json (neueste zuerst), damit der Diff ruhig bleibt
  const sortiert = {};
  for (const f of folgen) if (daten.folgen[f.slug]) sortiert[f.slug] = daten.folgen[f.slug];
  daten.folgen = sortiert;
  fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + "\n");
}

const auto = Object.entries(daten.folgen).filter(([, e]) => !Array.isArray(e));
const zeilen = auto.map(([slug, e]) => `Themen automatisch vergeben: ${slug} → ${e.themen.map((k) => daten.themen[k]).join(", ")}${neu.includes(slug) ? "" : " (noch nicht geprüft)"}`);
for (const z of zeilen) console.log(`::warning::${z}`);
if (zeilen.length && process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n⚠️ **Themen automatisch vergeben** (bitte im Projekt-Chat prüfen, geprüfte Themen per \`uebergabe\`):\n\n${zeilen.map((z) => `- ${z.replace("Themen automatisch vergeben: ", "")}`).join("\n")}\n`);
}
console.log(`Themen ok: ${themen.size} Themen, ${Object.keys(daten.folgen).length} Folgen${auto.length ? `, davon ${auto.length} automatisch` : ""}.`);
