// Prüft eine ausgelieferte Fassung der Seite (live oder test.) im
// Headless-Browser — nur lesend. Aufruf (im Workflow live-pruefen.yml):
//   node live-pruefen.mjs https://www.daslebenistzukurzfuerirgendwann.de
//
// Prüft: Ist es überhaupt die neue Seite (nicht PodView)? /blog/ mit Karten,
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
const robots = (await start.pg.request.get(basis + "/")).headers()["x-robots-tag"] ?? "–";
console.log(`       X-Robots-Tag: ${robots}`);
await start.ctx.close();

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
