// Sichert die bestehende PodView-Seite als Referenz unter docs/original/.
//
// Laeuft NUR in GitHub Actions (.github/workflows/referenz-holen.yml), weil
// die Live-Seite aus der Entwicklungs-Sandbox nicht erreichbar ist.
//
// Gesichert werden:
//   html/<name>.html         Roh-HTML jeder Seite (nur Referenz, nicht ausgeliefert)
//   text/<name>.txt          sichtbarer Text jeder Seite
//   screenshots/<name>-<breite>.jpg   ganze Seite, mobil (390) und Desktop (1280)
//   stile/<name>-<breite>.json        berechnete Stile sichtbarer Elemente
//                                     (statt PodViews CSS zu kopieren)
//   svg/<name>-<n>.svg       Inline-SVGs (Plattform-Logos, Icons)
//   bilder/                  Logo, Cover, Favicon, sonstige Bilder
//   sitemaps/                sitemap.xml und alle sitemap-episodes-Seiten
//   feed.xml                 Schnappschuss des RSS-Feeds
//   episoden-adressen.json   alle Folgen-Adressen aus der Sitemap mit Titel,
//                            Datum und MP3-URL der jeweiligen Seite
//
// Aufruf: node referenz-holen.mjs <zielordner>
// (Das Skript wird zum Ausfuehren neben playwright/cheerio kopiert.)

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

const BASIS = "https://www.daslebenistzukurzfuerirgendwann.de";
const FEED = "https://anchor.fm/s/104754158/podcast/rss";
const ZIEL = path.resolve(process.argv[2] || "docs/original");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 dlizkfi-referenz";

const SEITEN = [
  ["start", "/"],
  ["episodes", "/episodes/"],
  ["episodes-page-2", "/episodes/page/2/"],
  ["about", "/about/"],
  ["contact", "/contact/"],
  ["follow", "/follow/"],
  ["privacy", "/privacy/"],
  ["404", "/diese-seite-gibt-es-nicht/"],
];

async function holen(url, als = "text") {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return als === "buffer" ? Buffer.from(await r.arrayBuffer()) : r.text();
}

async function schreiben(datei, inhalt) {
  const p = path.join(ZIEL, datei);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, inhalt);
}

const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- Sitemaps
const sitemapUrls = [];
const episodenUrls = [];
try {
  const index = await holen(`${BASIS}/sitemap.xml`);
  await schreiben("sitemaps/sitemap.xml", index);
  const $ = cheerio.load(index, { xmlMode: true });
  $("sitemap > loc").each((_, e) => sitemapUrls.push($(e).text().trim()));
  $("url > loc").each((_, e) => episodenUrls.push($(e).text().trim()));
} catch (e) {
  log("sitemap.xml:", e.message);
}
// sitemap-episodes immer seitenweise abklappern, bis eine Seite leer ist
for (let n = 1; n <= 20; n++) {
  const u = `${BASIS}/sitemap-episodes.xml?page=${n}`;
  if (!sitemapUrls.includes(u)) sitemapUrls.push(u);
}
const alleSeitenUrls = new Set();
for (const u of sitemapUrls) {
  try {
    const xml = await holen(u);
    const $ = cheerio.load(xml, { xmlMode: true });
    const locs = $("url > loc").map((_, e) => $(e).text().trim()).get();
    const name = u.replace(BASIS + "/", "").replace(/[?=&]/g, "-");
    if (locs.length === 0 && /sitemap-episodes/.test(u)) break;
    await schreiben(`sitemaps/${name}`, xml);
    locs.forEach((l) => alleSeitenUrls.add(l));
    log(`${u}: ${locs.length} Adressen`);
  } catch (e) {
    log(u, e.message);
    if (/sitemap-episodes/.test(u)) break;
  }
}
const folgenAdressen = [...alleSeitenUrls].filter((u) => /\/episodes\/[^/]+\/?$/.test(u) && !/\/page\//.test(u));
log(`Folgen-Adressen in den Sitemaps: ${folgenAdressen.length}`);

// ---------------------------------------------------------------- Feed
try {
  await schreiben("feed.xml", await holen(FEED));
  log("feed.xml gesichert");
} catch (e) {
  log("Feed:", e.message);
}

// ---------------------------------------------------------------- Folgenseiten (nur Metadaten)
const episoden = [];
for (const u of folgenAdressen) {
  try {
    const html = await holen(u);
    const $ = cheerio.load(html);
    const mp3 = (html.match(/https?:\/\/[^"'\s<>]+\.(?:mp3|m4a)[^"'\s<>]*/i) || [null])[0];
    const ld = $('script[type="application/ld+json"]').map((_, e) => $(e).html()).get();
    let datum = $('meta[property="article:published_time"]').attr("content") || null;
    for (const s of ld) {
      const m = s.match(/"datePublished"\s*:\s*"([^"]+)"/);
      if (m && !datum) datum = m[1];
    }
    episoden.push({
      url: u,
      slug: u.replace(/\/$/, "").split("/").pop(),
      titel: ($('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").text()).trim(),
      h1: $("h1").first().text().trim(),
      datum,
      mp3: mp3 ? mp3.replace(/&amp;/g, "&") : null,
    });
  } catch (e) {
    episoden.push({ url: u, fehler: e.message });
  }
}
await schreiben("episoden-adressen.json", JSON.stringify(episoden, null, 2) + "\n");

// ---------------------------------------------------------------- Seiten mit Browser
const browser = await chromium.launch();
const bilder = new Set();
const ersteFolge = folgenAdressen[0];
const seiten = [...SEITEN];
if (ersteFolge) seiten.push(["folge", new URL(ersteFolge).pathname]);

const STIL_KEYS = [
  "display", "position", "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
  "text-transform", "color", "background-color", "background-image", "padding", "margin", "border",
  "border-radius", "box-shadow", "gap", "grid-template-columns", "flex-direction", "justify-content",
  "align-items", "max-width", "width", "height", "opacity", "text-align", "text-decoration",
];

for (const [name, pfad] of seiten) {
  const url = BASIS + pfad;
  // Roh-HTML
  try {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    await schreiben(`html/${name}.html`, await r.text());
    log(`${name}: HTTP ${r.status}`);
  } catch (e) {
    log(name, e.message);
  }
  for (const breite of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 }, userAgent: UA, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ZIEL, "screenshots", `${name}-${breite}.jpg`), fullPage: true, type: "jpeg", quality: 70 });
      const daten = await page.evaluate((keys) => {
        const out = [];
        const els = [...document.body.querySelectorAll("*")];
        for (const el of els) {
          if (out.length >= 900) break;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          if (["SCRIPT", "STYLE", "PATH", "G", "DEFS"].includes(el.tagName.toUpperCase())) continue;
          const cs = getComputedStyle(el);
          const stil = {};
          for (const k of keys) stil[k] = cs.getPropertyValue(k);
          const eigenerText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
          out.push({
            tag: el.tagName.toLowerCase(),
            klasse: typeof el.className === "string" ? el.className : el.getAttribute("class"),
            id: el.id || undefined,
            href: el.getAttribute("href") || undefined,
            text: eigenerText.slice(0, 80) || undefined,
            box: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
            stil,
          });
        }
        const rootVars = {};
        const rs = getComputedStyle(document.documentElement);
        for (const s of document.styleSheets) {
          try {
            for (const rule of s.cssRules) {
              if (rule.selectorText === ":root" || rule.selectorText === "html") {
                for (const p of rule.style) if (p.startsWith("--")) rootVars[p] = rs.getPropertyValue(p).trim();
              }
            }
          } catch {}
        }
        const svgs = [...document.querySelectorAll("svg")].map((s) => ({
          html: s.outerHTML,
          label: s.closest("a")?.getAttribute("aria-label") || s.closest("a")?.textContent.trim().slice(0, 40) || s.getAttribute("aria-label") || "",
          href: s.closest("a")?.href || "",
        }));
        const imgs = [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src);
        const bgs = els.map((e) => getComputedStyle(e).backgroundImage).filter((b) => b && b.startsWith("url("));
        const links = [...document.querySelectorAll("a[href]")].map((a) => ({ text: a.textContent.trim().replace(/\s+/g, " ").slice(0, 60), href: a.href, aria: a.getAttribute("aria-label") || undefined }));
        return { elemente: out, rootVars, svgs, imgs, bgs, links, text: document.body.innerText };
      }, STIL_KEYS);
      await schreiben(`stile/${name}-${breite}.json`, JSON.stringify({ url, breite, rootVars: daten.rootVars, links: daten.links, elemente: daten.elemente }, null, 1));
      if (breite === 1280) {
        await schreiben(`text/${name}.txt`, daten.text);
        let n = 0;
        for (const s of daten.svgs) {
          n++;
          await schreiben(`svg/${name}-${String(n).padStart(2, "0")}.svg`, `<!-- ${s.label} | ${s.href} -->\n${s.html}\n`);
        }
        daten.imgs.forEach((u) => bilder.add(u));
        daten.bgs.forEach((b) => { const m = b.match(/url\("?([^")]+)"?\)/); if (m) bilder.add(m[1]); });
        const $ = cheerio.load(await page.content());
        $('meta[property="og:image"], link[rel*="icon"]').each((_, e) => bilder.add($(e).attr("content") || $(e).attr("href")));
      }
    } catch (e) {
      log(`${name} @${breite}:`, e.message);
    }
    await ctx.close();
  }
}
await browser.close();

// ---------------------------------------------------------------- Bilder
const bilderListe = [];
for (const u of bilder) {
  if (!u || u.startsWith("data:")) continue;
  try {
    const abs = new URL(u, BASIS).href;
    const buf = await holen(abs, "buffer");
    const base = path.basename(new URL(abs).pathname).replace(/[^a-zA-Z0-9._-]/g, "_") || "bild";
    const datei = `bilder/${bilderListe.length.toString().padStart(2, "0")}-${base}`;
    await schreiben(datei, buf);
    bilderListe.push({ datei, quelle: abs, bytes: buf.length });
  } catch (e) {
    bilderListe.push({ quelle: u, fehler: e.message });
  }
}
await schreiben("bilder/liste.json", JSON.stringify(bilderListe, null, 2) + "\n");

for (const d of ["robots.txt"]) {
  try { await schreiben(d, await holen(`${BASIS}/${d}`)); } catch {}
}
log(`Fertig: ${episoden.length} Folgenseiten, ${bilderListe.length} Bilder.`);
