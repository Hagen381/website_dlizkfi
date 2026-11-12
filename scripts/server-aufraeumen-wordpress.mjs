// Liste für das einmalige Entfernen der alten WordPress-Installation im
// Wurzelordner des All-Inkl-Webspace. Wird von scripts/server-aufraeumen.sh
// im Modus wordpress-testlauf / wordpress aufgerufen (das holt die Listen per
// FTPS und löscht); dieses Skript löscht nichts.
//
//   node scripts/server-aufraeumen-wordpress.mjs <listen-ordner> <export> <ausgabe-ordner>
//
// <listen-ordner>: wurzel.txt (lftp find -l -d 2 .), je WordPress-Ordner
// <ordner>.txt (find -l <ordner>/), live-pfade.txt (Verweise der Live-Seite).
//
// Feste Pfadliste statt Vergleich (ausdrücklicher Auftrag, 12.11.2026):
//   Ordner  wp-admin/ wp-content/ wp-includes/ pinterest-media/ (mit Inhalt)
//   Dateien wp-*.php xmlrpc.php index.php readme.html license.txt index.htm
// Nie: Punkt-Dateien/-Ordner (.htaccess, .htpasswd, .well-known …) und alles
// darunter — der Ordner darüber bleibt dann stehen; nichts, was im Export
// steht oder worauf die Live-Seite verweist (dann Abbruch).
// Abbruch (Exit 1), wenn ein Eintrag außerhalb der Liste betroffen wäre oder
// ein Pfad Anführungszeichen, Backslash oder Steuerzeichen enthält.
//
// Ausgabe wie server-aufraeumen-liste.mjs: kandidaten.tsv, bericht.md,
// pruefsumme.txt, anzahl.txt, warnungen.txt, live-abweichung.txt (leer).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [listen, exportOrdner, aus] = process.argv.slice(2);
if (!listen || !exportOrdner || !aus) {
  console.error("Aufruf: server-aufraeumen-wordpress.mjs <listen-ordner> <export> <ausgabe-ordner>");
  process.exit(2);
}

const WP_ORDNER = ["wp-admin", "wp-content", "wp-includes", "pinterest-media"];
const WP_DATEI = /^(wp-[A-Za-z0-9._-]*\.php|xmlrpc\.php|index\.php|readme\.html|license\.txt|index\.htm)$/;
const UNSICHER = /["\\\x00-\x1f\x7f]/;

const exportPfade = new Set();
(function lesen(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    exportPfade.add(p);
    if (e.isDirectory()) lesen(path.join(dir, e.name), p);
  }
})(exportOrdner, "");

const lies = (f) => (fs.existsSync(path.join(listen, f)) ? fs.readFileSync(path.join(listen, f), "utf8") : "");
const livePfade = new Set(lies("live-pfade.txt").split("\n").map((s) => s.trim().replace(/^\/+/, "")).filter(Boolean));

const ZEILE = /^(\S+)\s+(\S+)\s+(\d+|-)\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s+(.+)$/;
const server = new Map(); // pfad -> { ordner, bytes }
const unlesbar = [];
function einlesen(datei) {
  for (const roh of lies(datei).split("\n")) {
    const z = roh.replace(/\r$/, "");
    if (!z.trim()) continue;
    const m = ZEILE.exec(z);
    if (!m) { if (!/\s\.\/?$/.test(z)) unlesbar.push(z); continue; }
    let p = m[6];
    const ordner = p.endsWith("/") || m[1].startsWith("d");
    p = p.replace(/^\.\//, "").replace(/\/+$/, "");
    if (!p || p === ".") continue;
    server.set(p, { ordner, bytes: m[3] === "-" ? 0 : Number(m[3]) });
  }
}
einlesen("wurzel.txt");
for (const o of WP_ORDNER) einlesen(`${o}.txt`);

const warnungen = [];
const fehler = [];
const dateien = new Map(); // pfad -> bytes
const ordner = new Set();
const bleibt = new Set();
let punkt = 0;

for (const [p, info] of [...server].sort(([a], [b]) => a.localeCompare(b))) {
  const teile = p.split("/");
  const oben = teile[0];
  if (teile.length === 1) {
    if (p.startsWith(".")) { punkt++; continue; }
    if (info.ordner) { if (WP_ORDNER.includes(p)) ordner.add(p); continue; }
    if (WP_DATEI.test(p)) dateien.set(p, info.bytes);
    else if (/^wp-/i.test(p) || /\.php$/i.test(p)) warnungen.push(`Datei ${p} im Wurzelordner steht nicht in der festen Liste — bleibt.`);
    continue;
  }
  if (!WP_ORDNER.includes(oben)) continue; // find -l -d 2 liefert auch eine Ebene tiefer
  if (teile.some((t) => t.startsWith("."))) {
    punkt++;
    for (let i = 1; i < teile.length; i++) bleibt.add(teile.slice(0, i).join("/"));
    if (!teile.slice(0, -1).some((t) => t.startsWith("."))) warnungen.push(`Punkt-Datei/-Ordner ${p}${info.ordner ? "/" : ""} — bleibt (der Ordner darüber auch).`);
    continue;
  }
  if (info.ordner) ordner.add(p); else dateien.set(p, info.bytes);
}

const alle = [...dateien.keys(), ...ordner];
for (const p of alle) {
  const oben = p.split("/")[0];
  const inListe = p.includes("/") ? WP_ORDNER.includes(oben) : WP_ORDNER.includes(p) || WP_DATEI.test(p);
  if (!inListe) fehler.push(`Außerhalb der festen Liste: ${p}`);
  if (exportPfade.has(p)) fehler.push(`Steht im aktuellen Export: ${p}`);
  if (livePfade.has(p)) fehler.push(`Die Live-Seite verweist darauf: ${p}`);
  if (UNSICHER.test(p)) fehler.push(`Pfad mit Anführungszeichen, Backslash oder Steuerzeichen: ${JSON.stringify(p)}`);
  if (p.split("/").some((t) => t === ".." || t.startsWith("."))) fehler.push(`Punkt im Pfad: ${p}`);
}

const ordnerWeg = [...ordner].filter((d) => !bleibt.has(d)).sort((a, b) => b.split("/").length - a.split("/").length || a.localeCompare(b));
const dateiWeg = [...dateien.keys()].sort();

fs.mkdirSync(aus, { recursive: true });
fs.writeFileSync(path.join(aus, "kandidaten.tsv"),
  [...dateiWeg.map((p) => `f\t${dateien.get(p)}\t${p}`), ...ordnerWeg.map((p) => `d\t0\t${p}`)].join("\n") + (dateiWeg.length + ordnerWeg.length ? "\n" : ""));
const pruefsumme = crypto.createHash("sha256").update([...dateiWeg, ...ordnerWeg.map((d) => d + "/")].sort().join("\n")).digest("hex").slice(0, 16);
fs.writeFileSync(path.join(aus, "pruefsumme.txt"), pruefsumme + "\n");
fs.writeFileSync(path.join(aus, "anzahl.txt"), `${dateiWeg.length}\n`);
fs.writeFileSync(path.join(aus, "live-abweichung.txt"), "");

const MB = (b) => (b / 1048576).toFixed(2);
const zeilen = ["| WordPress | Dateien | MB | Ordner |", "|---|---:|---:|---:|"];
let sA = 0, sB = 0;
for (const g of [...WP_ORDNER, "Wurzel"]) {
  const d = dateiWeg.filter((p) => (g === "Wurzel" ? !p.includes("/") : p.split("/")[0] === g));
  const b = d.reduce((s, p) => s + dateien.get(p), 0);
  const o = ordnerWeg.filter((p) => (g === "Wurzel" ? false : p === g || p.startsWith(g + "/"))).length;
  sA += d.length; sB += b;
  zeilen.push(`| ${g === "Wurzel" ? "Wurzel (wp-*.php, xmlrpc.php, index.php, readme.html, license.txt, index.htm)" : g + "/"} | ${d.length} | ${MB(b)} | ${o} |`);
}
zeilen.push(`| **Gesamt** | **${sA}** | **${MB(sB)}** | **${ordnerWeg.length}** |`, "");
const fehlendeOrdner = WP_ORDNER.filter((o) => !server.has(o));
zeilen.push(`- Server-Einträge gelesen: ${server.size}`);
if (fehlendeOrdner.length) zeilen.push(`- Nicht (mehr) auf dem Server: ${fehlendeOrdner.map((o) => o + "/").join(", ")}`);
zeilen.push(`- Punkt-Dateien/-Ordner (nie angefasst): ${punkt}`);
zeilen.push(`- Prüfsumme der Liste: \`${pruefsumme}\``);
for (const z of unlesbar.slice(0, 20)) warnungen.push(`Listenzeile nicht lesbar: ${z}`);
zeilen.push("", `**Warnungen (${warnungen.length}, nichts davon wird gelöscht):**`, ...(warnungen.length ? warnungen.map((w) => `- ${w}`) : ["- keine"]));
if (fehler.length) zeilen.push("", `**ABBRUCH (${fehler.length}):**`, ...fehler.slice(0, 50).map((f) => `- ${f}`));
fs.writeFileSync(path.join(aus, "warnungen.txt"), warnungen.join("\n") + (warnungen.length ? "\n" : ""));
fs.writeFileSync(path.join(aus, "bericht.md"), zeilen.join("\n") + "\n");
console.log(zeilen.join("\n"));
if (fehler.length) process.exit(1);
