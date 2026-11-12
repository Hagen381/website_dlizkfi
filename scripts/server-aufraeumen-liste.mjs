// Vergleicht die Dateiliste des All-Inkl-Servers mit dem aktuellen Export und
// bestimmt, was weg darf. Wird von scripts/server-aufraeumen.sh aufgerufen
// (das holt die Listen per FTPS und löscht); dieses Skript löscht nichts.
//
//   node scripts/server-aufraeumen-liste.mjs <listen-ordner> <export> <ausgabe-ordner>
//
// <listen-ordner> enthält die Ausgaben von lftp `find -l`:
//   wurzel.txt (find -l -d 2 .) und je Bereich <bereich>.txt (find -l <bereich>/)
//   live-pfade.txt   Pfade, auf die die Live-Seiten verweisen (ohne / vorne)
//   live-build-id.txt  Build-ID der Live-Seite (darf leer sein)
// Umgebung: MIN_ALTER_TAGE (Standard 7), JETZT (Unix-Sekunden, nur für Tests)
//
// Ausgabe-Ordner:
//   kandidaten.tsv   f|d <TAB> Bytes <TAB> Pfad   (Dateien, dann leere Ordner,
//                    tiefste zuerst)
//   bericht.md       Liste je Bereich (Anzahl, MB), Gesamt, Warnungen
//   pruefsumme.txt   SHA-256 über die sortierte Kandidatenliste
//   live-abweichung.txt  Pfade, die die Live-Seite nutzt, die aber nicht im
//                    Export stehen (dann ist der Server nicht auf dem Stand
//                    des Exports — Löschmodus bricht ab)
//
// Regeln (siehe CLAUDE.md, Abschnitt Server, „Server aufräumen"):
// - nur in _next/, images/, episodes/, blog/, entwurf/ und Einzeldateien direkt
//   im Wurzelordner mit Build-Endung; alles andere nur Warnung
// - nie: Punkt-Dateien/-Ordner (auch nichts darunter), was im Export steht,
//   Namen außerhalb ^[A-Za-z0-9][A-Za-z0-9._-]*$ (Bereich _next selbst und die
//   Manifeste _next/static/<build-id>/_…Manifest.js, Build-IDs mit „_"/„-" am
//   Anfang an ihrer Stelle _next/<id> bzw. _next/static/<id> und RSC-Dateien
//   __next.….txt unter episodes/, blog/, entwurf/ ausgenommen), Bestätigungsdateien
//   (google….html, BingSiteAuth.xml, yandex_….html)
// - _next/static/: nur, wenn älter als MIN_ALTER_TAGE (Besucher mit alter
//   Seite im Cache); Build-ID und Verweise der Live-Seite bleiben immer

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [listen, exportOrdner, aus] = process.argv.slice(2);
if (!listen || !exportOrdner || !aus) {
  console.error("Aufruf: server-aufraeumen-liste.mjs <listen-ordner> <export> <ausgabe-ordner>");
  process.exit(2);
}

const BEREICHE = ["_next", "images", "episodes", "blog", "entwurf"];
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// Einzige Ausnahme von NAME: die drei Manifeste je Build-ID, die Next selbst
// so benennt (_next/static/<build-id>/_buildManifest.js usw.)
const NEXT_MANIFEST = /^_(buildManifest|ssgManifest|clientMiddlewareManifest)\.js$/;
// Zweite Ausnahme: Build-IDs (Nanoid, darf mit „_" oder „-" beginnen), aber
// nur genau an ihrer Stelle: _next/<id> und _next/static/<id>
const BUILD_ID = /^[A-Za-z0-9_-]{16,64}$/;
// Dritte Ausnahme: RSC-Daten wie __next._full.txt oder
// __next.episodes.page.$d$seite.__PAGE__.txt — nur als Datei unter
// episodes/, blog/ oder entwurf/
const NEXT_RSC = /^__next\.[A-Za-z0-9_.$-]+\.txt$/;
const WURZEL_ENDUNG = /\.(html|txt|xml|json|webp|jpg|png|ico|svg|woff2)$/;
const WURZEL_TXT = /^(index|404|__next\..+)\.txt$/; // nur RSC-Daten
const BESTAETIGUNG = /^(google[0-9a-f]+\.html|BingSiteAuth\.xml|yandex_[0-9a-f]+\.html)$/i;
// Dateien anderer Software im Wurzelordner (dort liegt noch eine alte
// WordPress-Installation) — nie Build-Ergebnis
const FREMD = /^(readme\.html|license\.txt|wp-.*|xmlrpc\.php|index\.php)$/i;
const minAlter = Number(process.env.MIN_ALTER_TAGE ?? 7) * 86400;
const jetzt = Number(process.env.JETZT || Math.floor(Date.now() / 1000));

// ---- Export --------------------------------------------------------------
const exportDateien = new Set();
const exportOrdnerSet = new Set();
(function lesen(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { exportOrdnerSet.add(p); lesen(path.join(dir, e.name), p); }
    else exportDateien.add(p);
  }
})(exportOrdner, "");

// ---- Live-Seite ----------------------------------------------------------
const lies = (f) => (fs.existsSync(path.join(listen, f)) ? fs.readFileSync(path.join(listen, f), "utf8") : "");
const livePfade = new Set(lies("live-pfade.txt").split("\n").map((s) => s.trim().replace(/^\/+/, "")).filter(Boolean));
const liveBuildId = lies("live-build-id.txt").trim();
const buildIdOk = /^[A-Za-z0-9_-]{8,64}$/.test(liveBuildId);
const liveGeschuetzt = (p) =>
  livePfade.has(p) ||
  (buildIdOk && (p === `_next/static/${liveBuildId}` || p.startsWith(`_next/static/${liveBuildId}/`) ||
                 p === `_next/${liveBuildId}` || p.startsWith(`_next/${liveBuildId}/`)));

// ---- Server-Listen (lftp find -l) ----------------------------------------
// Zeile: "<rechte> <besitzer> <bytes|-> <JJJJ-MM-TT> <uhrzeit, optional> <pfad>"
const ZEILE = /^(\S+)\s+(\S+)\s+(\d+|-)\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s+(.+)$/;
const server = new Map(); // pfad -> { ordner, bytes, zeit }
const unlesbar = [];
function einlesen(datei) {
  for (const roh of lies(datei).split("\n")) {
    const z = roh.replace(/\r$/, "");
    if (!z.trim()) continue;
    const m = ZEILE.exec(z);
    if (!m) { if (!/^\S+\s+-\s+-\s+\.\/?\/?$/.test(z.trim()) && !/\s\.\/$/.test(z)) unlesbar.push(z); continue; }
    let p = m[6];
    const ordner = p.endsWith("/") || m[1].startsWith("d");
    p = p.replace(/^\.\//, "").replace(/\/+$/, "");
    if (!p || p === ".") continue;
    const zeit = Date.parse(`${m[4]}T${m[5] ? (m[5].length === 5 ? m[5] + ":00" : m[5]) : "00:00:00"}Z`) / 1000;
    server.set(p, { ordner, bytes: m[3] === "-" ? 0 : Number(m[3]), zeit: Number.isFinite(zeit) ? zeit : NaN });
  }
}
einlesen("wurzel.txt");
for (const b of BEREICHE) einlesen(`${b}.txt`);

// ---- Einordnen -----------------------------------------------------------
const warnungen = [];
const kandidaten = new Map(); // pfad -> { bytes, bereich }
const kandidatOrdner = new Set();
const bleibt = new Set(); // Pfade, die bleiben (für die Ordner-Entscheidung)
const jung = { anzahl: 0, bytes: 0 };
let punkt = 0;
let liveTreffer = [];
const MB = (b) => (b / 1048576).toFixed(2);

for (const [p, info] of [...server].sort(([a], [b]) => a.localeCompare(b))) {
  const teile = p.split("/");
  const bereich = BEREICHE.includes(teile[0]) ? teile[0] : null;

  if (teile.length === 1) {
    // Direkt im Wurzelordner
    if (p.startsWith(".")) { punkt++; continue; }
    if (info.ordner) {
      if (exportOrdnerSet.has(p)) continue;
      if (bereich) { kandidatOrdner.add(p); continue; } // z. B. entwurf/ — nur, wenn darunter nichts bleibt
      warnungen.push(`Ordner ${p}/ im Wurzelordner gehört nicht zum Export und liegt außerhalb der Bereiche — bleibt.`);
      continue;
    }
    if (exportDateien.has(p)) continue;
    if (!NAME.test(p)) { warnungen.push(`Ungewöhnlicher Dateiname im Wurzelordner: „${p}" — bleibt.`); continue; }
    if (FREMD.test(p)) { warnungen.push(`Datei ${p} im Wurzelordner gehört zu einer anderen Software (WordPress) — bleibt.`); continue; }
    if (BESTAETIGUNG.test(p)) { warnungen.push(`Bestätigungsdatei (Suchmaschine) im Wurzelordner: ${p} — bleibt.`); continue; }
    if (!WURZEL_ENDUNG.test(p) || (p.endsWith(".txt") && !WURZEL_TXT.test(p))) {
      warnungen.push(`Datei ${p} im Wurzelordner ist kein eindeutiges Build-Ergebnis — bleibt.`);
      continue;
    }
    if (liveGeschuetzt(p)) { liveTreffer.push(p); continue; }
    kandidaten.set(p, { bytes: info.bytes, bereich: "Wurzel" });
    continue;
  }

  if (!bereich) continue; // Unterordner anderer Wurzelordner werden nie gelistet

  const markieren = () => { for (let i = 1; i < teile.length; i++) bleibt.add(teile.slice(0, i).join("/")); bleibt.add(p); };
  if (teile.some((t) => t.startsWith("."))) {
    punkt++; markieren();
    if (!teile.slice(0, -1).some((t) => t.startsWith("."))) warnungen.push(`Punkt-Datei/-Ordner ${p}${info.ordner ? "/" : ""} — bleibt.`);
    continue;
  }
  if (info.ordner && exportOrdnerSet.has(p)) { bleibt.add(p); continue; }
  if (!info.ordner && exportDateien.has(p)) { markieren(); continue; }
  // Der Bereich _next selbst beginnt mit „_" — geprüft werden die Namen darunter
  const nameOk = (t, i) =>
    NAME.test(t) ||
    (i === teile.length - 1 && teile.length === 4 && p.startsWith("_next/static/") && NEXT_MANIFEST.test(t)) ||
    (bereich === "_next" && BUILD_ID.test(t) && ((i === 1 && t !== "static") || (i === 2 && teile[1] === "static"))) ||
    (!info.ordner && i === teile.length - 1 && ["episodes", "blog", "entwurf"].includes(bereich) && NEXT_RSC.test(t));
  if (!teile.every((t, i) => i === 0 || nameOk(t, i))) { warnungen.push(`Ungewöhnlicher Name: „${p}" — bleibt.`); markieren(); continue; }

  if (info.ordner) {
    if (liveGeschuetzt(p)) bleibt.add(p); else kandidatOrdner.add(p);
    continue;
  }
  if (liveGeschuetzt(p)) {
    markieren();
    // Die Build-ID der Live-Seite ist bei jedem Build neu — das ist erwartet.
    if (livePfade.has(p)) liveTreffer.push(p);
    continue;
  }
  if (p.startsWith("_next/static/")) {
    if (!Number.isFinite(info.zeit) || jetzt - info.zeit < minAlter) {
      jung.anzahl++; jung.bytes += info.bytes; markieren(); continue;
    }
  }
  kandidaten.set(p, { bytes: info.bytes, bereich });
}

// Ordner nur, wenn darunter nichts bleibt; tiefste zuerst
const ordnerWeg = [...kandidatOrdner].filter((d) => !bleibt.has(d)).sort((a, b) => b.split("/").length - a.split("/").length || a.localeCompare(b));
const dateiWeg = [...kandidaten.keys()].sort();

fs.mkdirSync(aus, { recursive: true });
fs.writeFileSync(path.join(aus, "kandidaten.tsv"),
  [...dateiWeg.map((p) => `f\t${kandidaten.get(p).bytes}\t${p}`), ...ordnerWeg.map((p) => `d\t0\t${p}`)].join("\n") + (dateiWeg.length + ordnerWeg.length ? "\n" : ""));
const pruefsumme = crypto.createHash("sha256").update([...dateiWeg, ...ordnerWeg.map((d) => d + "/")].sort().join("\n")).digest("hex").slice(0, 16);
fs.writeFileSync(path.join(aus, "pruefsumme.txt"), pruefsumme + "\n");
fs.writeFileSync(path.join(aus, "live-abweichung.txt"), liveTreffer.join("\n") + (liveTreffer.length ? "\n" : ""));
fs.writeFileSync(path.join(aus, "anzahl.txt"), `${dateiWeg.length}\n`);

// ---- Bericht --------------------------------------------------------------
const zeilen = [];
const reihen = [...BEREICHE.map((b) => [b, `${b}/`]), ["Wurzel", "Wurzel (Einzeldateien)"]];
let summeA = 0, summeB = 0;
zeilen.push("| Bereich | Dateien | MB | leere Ordner |", "|---|---:|---:|---:|");
for (const [b, label] of reihen) {
  const d = dateiWeg.filter((p) => kandidaten.get(p).bereich === b);
  const bytes = d.reduce((s, p) => s + kandidaten.get(p).bytes, 0);
  const o = ordnerWeg.filter((p) => p.split("/")[0] === b).length;
  summeA += d.length; summeB += bytes;
  zeilen.push(`| ${label} | ${d.length} | ${MB(bytes)} | ${o} |`);
}
zeilen.push(`| **Gesamt** | **${summeA}** | **${MB(summeB)}** | **${ordnerWeg.length}** |`);
zeilen.push("");
zeilen.push(`- Server-Einträge gelesen: ${server.size}, Dateien im Export: ${exportDateien.size}`);
zeilen.push(`- \`_next/static/\` jünger als ${minAlter / 86400} Tage, bleibt vorerst: ${jung.anzahl} Dateien (${MB(jung.bytes)} MB)`);
zeilen.push(`- Build-ID der Live-Seite: ${buildIdOk ? `\`${liveBuildId}\` (geschützt)` : "**nicht gefunden**"}; Live-Verweise geprüft: ${livePfade.size}`);
zeilen.push(`- Punkt-Dateien/-Ordner (nie angefasst): ${punkt}`);
zeilen.push(`- Prüfsumme der Liste: \`${pruefsumme}\``);
if (!buildIdOk) warnungen.push("Build-ID der Live-Seite nicht gefunden — im Löschmodus wird abgebrochen.");
for (const p of liveTreffer) warnungen.push(`Live-Seite verweist auf ${p}, das nicht im Export steht — bleibt (Server nicht auf dem Stand des Exports?).`);
for (const z of unlesbar.slice(0, 20)) warnungen.push(`Listenzeile nicht lesbar: ${z}`);
if (unlesbar.length > 20) warnungen.push(`… ${unlesbar.length - 20} weitere unlesbare Listenzeilen`);
zeilen.push("");
zeilen.push(`**Warnungen (${warnungen.length}, nichts davon wird gelöscht):**`);
zeilen.push(...(warnungen.length ? warnungen.map((w) => `- ${w}`) : ["- keine"]));
fs.writeFileSync(path.join(aus, "warnungen.txt"), warnungen.join("\n") + (warnungen.length ? "\n" : ""));
fs.writeFileSync(path.join(aus, "bericht.md"), zeilen.join("\n") + "\n");
console.log(zeilen.join("\n"));
