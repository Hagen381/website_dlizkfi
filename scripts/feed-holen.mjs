// Lädt den RSS-Feed und schreibt content/folgen.json.
//
//   node scripts/feed-holen.mjs                 Feed aus dem Netz
//   node scripts/feed-holen.mjs --datei x.xml   Feed aus einer Datei (Tests)
//
// Slugs:
//   1. Steht die Folge (gleiche guid) schon in content/folgen.json, bleibt ihr
//      Slug unverändert — eine einmal vergebene Adresse ändert sich nie.
//   2. Sonst wird sie einer alten PodView-Adresse aus content/alte-adressen.json
//      zugeordnet: zuerst über die Episoden-ID in der MP3-URL, dann über den
//      Titel (nach PodView-Regel), dann über das Datum (gleicher Tag).
//   3. Sonst (neue Folge) entsteht der Slug nach PodView-Regel (scripts/slug.mjs).
//
// Am Ende ein Bericht: Folgen gesamt, zugeordnet, neu, alte Adressen ohne Folge.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import sanitizeHtml from "sanitize-html";
import { linksAufraeumen } from "./shownotes-links.mjs";
import { slugify } from "./slug.mjs";

const FEED = "https://anchor.fm/s/104754158/podcast/rss";
const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zielDatei = path.join(wurzel, "content/folgen.json");
const alteDatei = path.join(wurzel, "content/alte-adressen.json");

const args = process.argv.slice(2);
const dateiIndex = args.indexOf("--datei");

async function feedLesen() {
  if (dateiIndex >= 0) return fs.readFile(path.resolve(args[dateiIndex + 1]), "utf8");
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const r = await fetch(FEED, { headers: { "user-agent": "dlizkfi-website-feedimport" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      console.error(`Feed-Abruf Versuch ${versuch} fehlgeschlagen: ${e.message}`);
      if (versuch === 3) throw e;
      await new Promise((ok) => setTimeout(ok, versuch * 3000));
    }
  }
}

const text = (v) => (v == null ? "" : typeof v === "object" ? String(v["#text"] ?? "") : String(v)).trim();

// "00:32:43" | "1963" -> Sekunden
function sekunden(d) {
  const t = text(d);
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  return t.split(":").map(Number).reduce((s, n) => s * 60 + n, 0);
}

// Shownotes bereinigen: nur einfache Textauszeichnung und Links. Danach
// linksAufraeumen(): „Spotify: https://…" → „Spotify" als Link, nackte URLs
// → Domain als Linktext, Link auf unsere eigene Domain entfällt.
function shownotes(html) {
  return linksAufraeumen(bereinigen(html));
}
function bereinigen(html) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "blockquote", "h2", "h3", "h4"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      h1: "h2",
      b: "strong",
      i: "em",
      div: "p",
      a: (tag, attribs) => ({ tagName: "a", attribs: { href: attribs.href || "", target: "_blank", rel: "noopener" } }),
    },
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren?.length && !/<br/.test(frame.text),
  })
    .replace(/(<p>\s*<\/p>)+/g, "")
    .replace(/(<br \/>\s*){3,}/g, "<br /><br />")
    .trim();
}

function klartext(html) {
  return sanitizeHtml(html.replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function auszug(t, max = 300) {
  if (t.length <= max) return t;
  const kurz = t.slice(0, max);
  return kurz.slice(0, kurz.lastIndexOf(" ")).replace(/[\s,;:–-]+$/, "") + " …";
}

const episodenId = (url) => (url || "").match(/\/play\/(\d+)\//)?.[1] ?? null;

// ------------------------------------------------------------------
const xml = await feedLesen();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", cdataPropName: false, trimValues: true });
const kanal = parser.parse(xml)?.rss?.channel;
if (!kanal) throw new Error("Feed ohne <channel> — Abbruch, folgen.json bleibt unverändert.");
const items = [].concat(kanal.item || []);
if (items.length === 0) throw new Error("Feed ohne Folgen — Abbruch, folgen.json bleibt unverändert.");

let bisher = [];
try {
  bisher = JSON.parse(await fs.readFile(zielDatei, "utf8")).folgen;
} catch {}
const bisherNachGuid = new Map(bisher.map((f) => [f.guid, f]));
const alte = JSON.parse(await fs.readFile(alteDatei, "utf8")).folgen;
const alteFrei = new Set(alte.map((a) => a.slug));

const bericht = { ausBestand: 0, mp3: 0, titel: 0, datum: 0, neu: [] };
const belegt = new Set();

const folgen = items.map((it) => {
  const titel = text(it.title);
  const guid = text(it.guid);
  const mp3 = it.enclosure?.["@_url"] || null;
  const datum = new Date(text(it.pubDate)).toISOString();
  const roh = text(it["content:encoded"]) || text(it.description) || "";
  const notizen = shownotes(roh);
  return {
    guid,
    titel,
    datum,
    dauer: sekunden(it["itunes:duration"]),
    mp3,
    mp3Bytes: Number(it.enclosure?.["@_length"]) || null,
    mp3Typ: it.enclosure?.["@_type"] || "audio/mpeg",
    bild: it["itunes:image"]?.["@_href"] || null,
    nummer: Number(text(it["itunes:episode"])) || null,
    typ: text(it["itunes:episodeType"]) || "full",
    spotifyLink: text(it.link) || null,
    // Kurzbeschreibung aus den aufgeräumten Shownotes: keine nackten URLs.
    beschreibung: auszug(klartext(notizen)),
    shownotes: notizen,
  };
});

// Slugs zuordnen
for (const f of folgen) {
  const alt = bisherNachGuid.get(f.guid);
  if (alt?.slug) {
    f.slug = alt.slug;
    f.zuordnung = alt.zuordnung;
    bericht.ausBestand++;
  }
}
const versuche = [
  ["mp3", (f, a) => episodenId(f.mp3) && episodenId(f.mp3) === episodenId(a.mp3)],
  ["titel", (f, a) => slugify(f.titel) === a.slug],
  ["datum", (f, a) => a.datum && f.datum.slice(0, 10) === a.datum.slice(0, 10)],
];
for (const f of folgen) if (f.slug) alteFrei.delete(f.slug);
for (const [art, passt] of versuche) {
  for (const f of folgen) {
    if (f.slug) continue;
    const treffer = alte.filter((a) => alteFrei.has(a.slug) && passt(f, a));
    if (treffer.length === 1) {
      f.slug = treffer[0].slug;
      f.zuordnung = `alt:${art}`;
      alteFrei.delete(f.slug);
      bericht[art]++;
    }
  }
}
for (const f of folgen) if (f.slug) belegt.add(f.slug);
for (const f of folgen) {
  if (f.slug) continue;
  let s = slugify(f.titel) || "folge";
  for (let n = 2; belegt.has(s) || alte.some((a) => a.slug === s); n++) s = `${slugify(f.titel)}-${n}`;
  f.slug = s;
  f.zuordnung = "neu";
  belegt.add(s);
  bericht.neu.push(s);
}

// Folgen, die es im Bestand gab, die aber nicht mehr im Feed stehen, bleiben
// erhalten (ihre Adresse darf nicht verschwinden).
const imFeed = new Set(folgen.map((f) => f.guid));
const verwaist = bisher.filter((f) => !imFeed.has(f.guid));
const alle = [...folgen, ...verwaist].sort((a, b) => b.datum.localeCompare(a.datum));

const ausgabe = {
  hinweis: "Automatisch erzeugt von scripts/feed-holen.mjs. Slugs NICHT von Hand ändern (alte Adressen!).",
  feed: FEED,
  anzahl: alle.length,
  folgen: alle.map(({ guid, slug, zuordnung, ...rest }) => ({ slug, guid, zuordnung, ...rest })),
};
const neuerInhalt = JSON.stringify(ausgabe, null, 2) + "\n";
let alterInhalt = "";
try {
  alterInhalt = await fs.readFile(zielDatei, "utf8");
} catch {}
await fs.mkdir(path.dirname(zielDatei), { recursive: true });
if (neuerInhalt !== alterInhalt) await fs.writeFile(zielDatei, neuerInhalt);

const ohneFolge = [...alteFrei];
console.log("Feed-Import");
console.log(`  Folgen im Feed:                 ${folgen.length}`);
console.log(`  Folgen in folgen.json gesamt:   ${alle.length}${verwaist.length ? ` (davon ${verwaist.length} nicht mehr im Feed)` : ""}`);
console.log(`  Slug aus Bestand übernommen:    ${bericht.ausBestand}`);
console.log(`  Alte Adresse über MP3-ID:       ${bericht.mp3}`);
console.log(`  Alte Adresse über Titel:        ${bericht.titel}`);
console.log(`  Alte Adresse über Datum:        ${bericht.datum}`);
console.log(`  Neue Slugs (PodView-Regel):     ${bericht.neu.length}${bericht.neu.length ? "\n    " + bericht.neu.join("\n    ") : ""}`);
console.log(`  Alte Adressen ohne Feed-Folge:  ${ohneFolge.length}${ohneFolge.length ? "\n    " + ohneFolge.join("\n    ") : ""}`);
console.log(neuerInhalt !== alterInhalt ? "content/folgen.json aktualisiert." : "content/folgen.json unverändert.");
