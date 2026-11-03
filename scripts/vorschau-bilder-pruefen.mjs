// Prüft die veröffentlichte Vorschau mit einem Headless-Browser: Auf den
// angegebenen Seiten darf kein einziges Bild (und keine Schrift/CSS/JS-Datei)
// mit einem Fehler antworten. Die Seite wird bis ganz nach unten gescrollt,
// damit auch lazy geladene Bilder angefordert werden.
//
// Läuft im Workflow gh-pages.yml nach dem Deploy (Playwright wird dort
// temporär installiert, das Skript daneben kopiert).
//
// Aufruf: node vorschau-bilder-pruefen.mjs https://hagen381.github.io/website_dlizkfi / /episodes/ …

import { chromium } from "playwright";

const [basis, ...seiten] = process.argv.slice(2);
if (!basis || seiten.length === 0) {
  console.error("Aufruf: vorschau-bilder-pruefen.mjs <basis-url> <pfad> [<pfad> …]");
  process.exit(2);
}

const browser = await chromium.launch();
let fehlerGesamt = 0;

for (const breite of [390, 1280]) {
  for (const pfad of seiten) {
    const url = basis.replace(/\/$/, "") + pfad;
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
    const page = await ctx.newPage();
    const bilder = new Map(); // url -> status
    const fehler = [];

    page.on("response", (r) => {
      const typ = r.request().resourceType();
      if (["image", "font", "stylesheet", "script"].includes(typ)) {
        if (typ === "image") bilder.set(r.url(), r.status());
        if (r.status() >= 400) fehler.push(`${r.status()} ${typ} ${r.url()}`);
      }
    });
    page.on("requestfailed", (r) => {
      const typ = r.resourceType();
      if (["image", "font", "stylesheet", "script"].includes(typ)) fehler.push(`FEHLGESCHLAGEN ${typ} ${r.url()} (${r.failure()?.errorText})`);
    });

    const antwort = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (!antwort || antwort.status() >= 400) fehler.push(`Seite selbst: ${antwort?.status()} ${url}`);

    // Schrittweise nach unten scrollen, damit lazy-Bilder laden
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
        window.scrollTo(0, y);
        await new Promise((ok) => setTimeout(ok, 150));
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // Zusätzlich: jedes <img> im DOM muss geladen und sichtbar dekodiert sein
    const kaputt = await page.evaluate(() =>
      [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    );
    for (const k of kaputt) fehler.push(`<img> nicht geladen: ${k}`);
    const anzahlImg = await page.evaluate(() => document.images.length);

    const status = fehler.length ? "FEHLER" : "ok";
    console.log(`${status.padEnd(6)} ${String(breite).padStart(4)}px ${pfad}  — ${anzahlImg} <img>, ${bilder.size} Bildanfragen, ${fehler.length} Fehler`);
    for (const f of fehler) console.log(`         ${f}`);
    fehlerGesamt += fehler.length;
    await ctx.close();
  }
}

await browser.close();
if (fehlerGesamt) {
  console.log(`\nBildprüfung FEHLGESCHLAGEN: ${fehlerGesamt} Fehler.`);
  process.exit(1);
}
console.log("\nBildprüfung ok: kein Bild, keine Schrift, kein CSS/JS mit Fehler.");
