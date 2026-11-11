// Prüft die Live-Seite im Headless-Browser — nur lesend. Aufruf (im Workflow
// live-pruefen.yml):
//   node live-pruefen.mjs https://www.daslebenistzukurzfuerirgendwann.de
//   node live-pruefen.mjs <basis> --nur-neueste   nur Startseite + neueste Folge
//                                                 (läuft nach einem Deploy mit
//                                                 neuer Folge automatisch mit)
//
// Prüft: Weiterleitungen (http -> https, ohne www -> www, alte Sitemaps),
// kein X-Robots-Tag, ist es die neue Seite? Polaroid-Collage der Startseite
// (Anzahl je Breite 360/390/820/1280/1440, Fotos geladen), neueste Folge erreichbar,
// /blog/ mit Karten,
// jeder veröffentlichte Artikel (Bilder, Bildunterschriften, Zur-Folge-Kasten),
// „Blog" in der Navigation, Kartenbilder, „Zur Podcastfolge"-Ziele, Sitemap,
// „Zum Blogartikel" auf der Folgenseite, 404 für /entwurf/startseite/
// (Entwürfe nur in der Vorschau), optional 404 für PRUEFE_404, alle
// Bilder/Schriften/CSS/JS ohne Fehler.

import { chromium } from "playwright";
import fs from "node:fs";

const basis = (process.argv[2] || "").replace(/\/$/, "");
const nurNeueste = process.argv.includes("--nur-neueste");
const artikel = fs.readdirSync("content/blog").filter((d) => d.endsWith(".md") && !d.startsWith("_") && d.toLowerCase() !== "readme.md");
const browser = await chromium.launch();
let fehler = 0;
const pruefe = (ok, text) => { console.log(`${ok ? "ok    " : "FEHLER"} ${text}`); if (!ok) fehler++; };

async function seite(pfad, breite = 1280) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const pg = await ctx.newPage();
  const kaputt = [];
  pg.on("response", (r) => { const t = r.request().resourceType(); if (["image", "font", "stylesheet", "script"].includes(t) && r.status() >= 400) kaputt.push(`${r.status()} ${r.url()}`); });
  const antwort = await pg.goto(basis + pfad, { waitUntil: "networkidle", timeout: 60000 });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } });
  await pg.waitForLoadState("networkidle");
  // Nur angezeigte Bilder: ausgeblendete (display: none, z. B. die kleinen
  // Mobil-Polaroids am Desktop) lädt der Browser wegen loading="lazy" nie.
  const unvollstaendig = await pg.evaluate(() => [...document.images].filter((i) => i.getClientRects().length > 0 && (!i.complete || !i.naturalWidth)).map((i) => i.currentSrc || i.src));
  return { pg, ctx, status: antwort?.status(), kaputt: [...kaputt, ...unvollstaendig.map((u) => "nicht geladen " + u)] };
}

const start = await seite("/");
const neueSeite = await start.pg.locator("text=Zum Inhalt springen").count();
pruefe(start.status === 200 && neueSeite > 0, `${basis}/ liefert die NEUE Seite (HTTP ${start.status}${neueSeite ? "" : ", sieht nach PodView/anderer Seite aus"})`);
if (!neueSeite) { console.log("Abbruch: Unter dieser Adresse läuft noch nicht die neue Seite."); await browser.close(); process.exit(fehler ? 1 : 0); }
pruefe((await start.pg.locator('body > header a[href$="/blog/"]').count()) > 0, "„Blog“ in der Navigation");
const robots = (await start.pg.request.get(basis + "/")).headers()["x-robots-tag"];
pruefe(!robots, `kein X-Robots-Tag auf ${basis}/ ${robots ? "(gefunden: " + robots + ")" : ""}`);
await start.ctx.close();

// Polaroid-Collage im Hero der Startseite: Anzahl sichtbarer Polaroids je
// Breite (content/startseite/collage.json), jedes sichtbare Foto geladen,
// unter 640 px nichts über den Rand, Glasfläche mit h1 und 3 Plattform-Kacheln.
{
  const { polaroids } = JSON.parse(fs.readFileSync("content/startseite/collage.json", "utf8"));
  const alle = polaroids.length;
  const ohneBand = polaroids.filter((p) => !p.band_hinter_der_mitte).length;
  const mobil = polaroids.filter((p) => p.mobil).length;
  for (const [breite, erwartet] of [[360, mobil], [390, mobil], [820, ohneBand], [1280, alle], [1440, alle]]) {
    const s = await seite("/", breite);
    const c = await s.pg.evaluate(() => {
      const sicht = [...document.querySelectorAll(".collage-hero .pola")].filter((e) => getComputedStyle(e).display !== "none");
      const bilder = sicht.map((e) => [...e.querySelectorAll("img")].find((i) => i.getClientRects().length > 0));
      return {
        sichtbar: sicht.length,
        geladen: bilder.filter((i) => i && i.complete && i.naturalWidth > 0).length,
        ueberRand: innerWidth < 640 ? sicht.filter((e) => { const r = e.querySelector(".pola-rahmen").getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).length : 0,
        h1: document.querySelectorAll(".collage-glas h1").length,
        kacheln: document.querySelectorAll(".collage-glas a[aria-label]").length,
      };
    });
    pruefe(c.sichtbar === erwartet && c.geladen === erwartet, `${breite}px Startseite: ${c.sichtbar} Polaroids sichtbar (erwartet ${erwartet}), ${c.geladen} Fotos geladen`);
    pruefe(c.ueberRand === 0 && c.h1 === 1 && c.kacheln === 3, `${breite}px Startseite: Glasfläche mit Titel und ${c.kacheln} Plattform-Kacheln${breite < 640 ? `, ${c.ueberRand} Polaroid(s) über dem Rand` : ""}`);
    pruefe(s.kaputt.length === 0, `${breite}px Startseite ohne Bild-/Schriftfehler ${s.kaputt.join(" | ")}`);
    await s.ctx.close();
  }
}

// Neueste Folge aus content/folgen.json muss live erreichbar sein (Titel als h1).
const neueste = JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen[0];
const nf = await seite(`/episodes/${neueste.slug}/`);
const nfTitel = nf.status === 200 ? (await nf.pg.locator("h1").first().innerText()).trim() : "";
pruefe(nf.status === 200 && nfTitel === neueste.titel, `neueste Folge /episodes/${neueste.slug}/ HTTP ${nf.status}${nfTitel ? ` „${nfTitel}“` : ""}`);
await nf.ctx.close();
if (nurNeueste) {
  await browser.close();
  console.log(fehler ? `\n${fehler} FEHLER` : "\nLive-Prüfung (neueste Folge) ok");
  process.exit(fehler ? 1 : 0);
}

// Weiterleitungen (nur wenn die Basis www.<domain> ist)
const host = new URL(basis).host;
if (host.startsWith("www.")) {
  const ohne = host.slice(4);
  const faelle = [
    [`http://${host}/`, `https://${host}/`],
    [`http://${host}/episodes/`, `https://${host}/episodes/`],
    [`https://${ohne}/`, `https://${host}/`],
    [`http://${ohne}/about/`, `https://${host}/about/`],
    [`https://${host}/sitemap-pages.xml`, `https://${host}/sitemap.xml`],
    [`https://${host}/sitemap-episodes.xml?page=1`, `https://${host}/sitemap.xml`],
    [`https://${host}/episodes/?page=2`, `https://${host}/episodes/page/2/`],
  ];
  for (const [von, nach] of faelle) {
    try {
      const r = await fetch(von, { redirect: "manual" });
      const ziel = r.headers.get("location") ? new URL(r.headers.get("location"), von).href : "";
      pruefe(r.status === 301 && ziel === nach, `${von} → ${r.status} ${ziel || "(keine Weiterleitung)"}`);
    } catch (e) {
      pruefe(false, `${von} → keine Antwort (${e.cause?.code || e.message})`);
    }
  }
}

const blog = await seite("/blog/");
pruefe(blog.status === 200, `/blog/ HTTP ${blog.status}`);
const karten = await blog.pg.locator("main article").count();
pruefe(karten === artikel.length, `/blog/ zeigt ${karten} Karte(n), veröffentlicht: ${artikel.length}`);
// Reihenfolge = Erscheinungsdatum der Folge (neueste zuerst), Datum auf jeder Karte
const folgenDaten = Object.fromEntries(JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen.map((f) => [f.slug, f.datum]));
const erwartet = artikel
  .map((d) => ({ slug: d.replace(/\.md$/, ""), datum: folgenDaten[fs.readFileSync(`content/blog/${d}`, "utf8").match(/folge-slug:\s*"?([^"\n]+)"?/)?.[1]] || "" }))
  .sort((x, y) => y.datum.localeCompare(x.datum));
const reihe = await blog.pg.locator("main article h2 a").evaluateAll((as) => as.map((x) => x.getAttribute("href").replace(/\/$/, "").split("/").pop()));
pruefe(JSON.stringify(reihe) === JSON.stringify(erwartet.map((e) => e.slug)), `/blog/ Reihenfolge nach Folgendatum: ${reihe.join(", ")}`);
const kartenDaten = await blog.pg.locator("main article time").evaluateAll((ts) => ts.map((t) => t.getAttribute("datetime")));
pruefe(JSON.stringify(kartenDaten) === JSON.stringify(erwartet.map((e) => e.datum)), `/blog/ Datum auf jeder Karte = Datum der Folge`);
pruefe(blog.kaputt.length === 0, `/blog/ ohne Bildfehler ${blog.kaputt.join(" | ")}`);
for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  const mdText = fs.readFileSync(`content/blog/${datei}`, "utf8");
  // Kartenbild aus dem Frontmatter, sonst das erste Bild im Artikel
  const erstes = (mdText.match(/^kartenbild:\s*"?([^"\n]+?)"?\s*$/m)?.[1] || mdText.match(/!\[[^\]]*\]\(bilder\/[^/]+\/([^)]+)\)/i)?.[1] || "").replace(/\.[a-z]+$/i, "") || null;
  if (!erstes) continue;
  const karte = blog.pg.locator(`main article:has(a[href$="/blog/${slug}/"])`);
  const src = (await karte.locator("img").first().getAttribute("srcset").catch(() => null)) || (await karte.locator("img").first().getAttribute("src").catch(() => "")) || "";
  pruefe(src.includes(erstes), `/blog/ Karte ${slug} zeigt Kartenbild ${erstes}`);
}
await blog.ctx.close();

for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  const md = fs.readFileSync(`content/blog/${datei}`, "utf8");
  const erwBilder = [...md.matchAll(/!\[([^\]]*)\]\(/g)].map((m) => m[1]);
  const folge = md.match(/folge-slug:\s*"?([^"\n]+)"?/)?.[1];
  for (const breite of [390, 1280]) {
    const a = await seite(`/blog/${slug}/`, breite);
    pruefe(a.status === 200, `${breite}px /blog/${slug}/ HTTP ${a.status}`);
    const zeit = await a.pg.locator("article header time").first().textContent().catch(() => "");
    pruefe(/^\d{1,2}\. [A-Za-zäÄöÖüÜ]+ \d{4}$/.test(zeit || ""), `${breite}px Datum im Artikel: ${zeit}`);
    const captions = await a.pg.locator("figcaption").allInnerTexts();
    pruefe(JSON.stringify(captions) === JSON.stringify(erwBilder), `${breite}px ${captions.length}/${erwBilder.length} Bilder mit passender Bildunterschrift`);
    pruefe((await a.pg.locator('body > header [aria-current="page"]').allInnerTexts()).join() === "Blog", `${breite}px „Blog“ aktiv`);
    if (folge) pruefe((await a.pg.locator("aside", { hasText: "Zur Folge" }).count()) === 1, `${breite}px Kasten „Zur Folge“`);
    if (folge) {
      const ziele = await a.pg.locator("a", { hasText: "Zur Podcastfolge" }).evaluateAll((as) => as.map((x) => x.getAttribute("href")));
      pruefe(ziele.length === 2 && ziele.every((h) => h.endsWith(`/episodes/${folge}/`)), `${breite}px 2× „Zur Podcastfolge“ → /episodes/${folge}/`);
    }
    pruefe(a.kaputt.length === 0, `${breite}px Artikel ohne Bild-/Schriftfehler ${a.kaputt.join(" | ")}`);
    await a.ctx.close();
  }
  if (folge) {
    const f = await seite(`/episodes/${folge}/`);
    pruefe((await f.pg.locator(`a[href$="/blog/${slug}/"]`, { hasText: "Zum Blogartikel" }).count()) === 1, `Folgenseite /episodes/${folge}/ verlinkt „Zum Blogartikel“`);
    await f.ctx.close();
  }
}
// Sitemap enthält jeden veröffentlichten Artikel
const sitemap = await (await fetch(basis + "/sitemap.xml")).text();
for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  pruefe(sitemap.includes(`/blog/${slug}/</loc>`), `sitemap.xml enthält /blog/${slug}/`);
}

// Entwürfe gibt es nur in der Vorschau (*.vorschau.tsx) — live immer 404.
for (const pfad of ["/entwurf/startseite/", "/entwurf/"]) {
  const r = await fetch(basis + pfad, { redirect: "manual" });
  pruefe(r.status === 404, `Entwurf ${pfad} → ${r.status} (erwartet 404)`);
}

// Optional: Pfade, die weg sein müssen (PRUEFE_404, kommagetrennt), z. B. entfernte Bilder
for (const pfad of (process.env.PRUEFE_404 || "").split(",").map((x) => x.trim()).filter(Boolean)) {
  const r = await fetch(basis + "/" + pfad.replace(/^\//, ""), { redirect: "manual" });
  pruefe(r.status === 404, `${pfad} → ${r.status} (erwartet 404)`);
}

await browser.close();
console.log(fehler ? `\n${fehler} FEHLER` : "\nLive-Prüfung ok");
process.exit(fehler ? 1 : 0);
