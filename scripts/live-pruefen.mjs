// Prüft die Live-Seite im Headless-Browser — nur lesend. Aufruf (im Workflow
// live-pruefen.yml):
//   node live-pruefen.mjs https://www.daslebenistzukurzfuerirgendwann.de
//
// Prüft: Weiterleitungen (http -> https, ohne www -> www, alte Sitemaps),
// kein X-Robots-Tag, ist es die neue Seite? neueste Folge erreichbar,
// /blog/ mit Karten,
// jeder veröffentlichte Artikel (Bilder, Bildunterschriften, Zur-Folge-Kasten),
// „Blog" in der Navigation, „Zum Blogartikel" auf der Folgenseite, alle
// Bilder/Schriften/CSS/JS ohne Fehler.

import { chromium } from "playwright";
import fs from "node:fs";

const basis = (process.argv[2] || "").replace(/\/$/, "");
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
  const unvollstaendig = await pg.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.currentSrc || i.src));
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

// Neueste Folge aus content/folgen.json muss live erreichbar sein (Titel als h1).
const neueste = JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen[0];
const nf = await seite(`/episodes/${neueste.slug}/`);
const nfTitel = nf.status === 200 ? (await nf.pg.locator("h1").first().innerText()).trim() : "";
pruefe(nf.status === 200 && nfTitel === neueste.titel, `neueste Folge /episodes/${neueste.slug}/ HTTP ${nf.status}${nfTitel ? ` „${nfTitel}“` : ""}`);
await nf.ctx.close();

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
pruefe(blog.kaputt.length === 0, `/blog/ ohne Bildfehler ${blog.kaputt.join(" | ")}`);
await blog.ctx.close();

for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  const md = fs.readFileSync(`content/blog/${datei}`, "utf8");
  const erwBilder = [...md.matchAll(/!\[([^\]]*)\]\(/g)].map((m) => m[1]);
  const folge = md.match(/folge-slug:\s*"?([^"\n]+)"?/)?.[1];
  for (const breite of [390, 1280]) {
    const a = await seite(`/blog/${slug}/`, breite);
    pruefe(a.status === 200, `${breite}px /blog/${slug}/ HTTP ${a.status}`);
    const captions = await a.pg.locator("figcaption").allInnerTexts();
    pruefe(JSON.stringify(captions) === JSON.stringify(erwBilder), `${breite}px ${captions.length}/${erwBilder.length} Bilder mit passender Bildunterschrift`);
    pruefe((await a.pg.locator('body > header [aria-current="page"]').allInnerTexts()).join() === "Blog", `${breite}px „Blog“ aktiv`);
    if (folge) pruefe((await a.pg.locator("aside", { hasText: "Zur Folge" }).count()) === 1, `${breite}px Kasten „Zur Folge“`);
    pruefe(a.kaputt.length === 0, `${breite}px Artikel ohne Bild-/Schriftfehler ${a.kaputt.join(" | ")}`);
    await a.ctx.close();
  }
  if (folge) {
    const f = await seite(`/episodes/${folge}/`);
    pruefe((await f.pg.locator(`a[href$="/blog/${slug}/"]`, { hasText: "Zum Blogartikel" }).count()) === 1, `Folgenseite /episodes/${folge}/ verlinkt „Zum Blogartikel“`);
    await f.ctx.close();
  }
}
await browser.close();
console.log(fehler ? `\n${fehler} FEHLER` : "\nLive-Prüfung ok");
process.exit(fehler ? 1 : 0);
