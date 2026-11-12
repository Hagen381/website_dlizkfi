// Prüft die veröffentlichte Vorschau mit einem Headless-Browser: Auf den
// angegebenen Seiten darf kein einziges Bild (und keine Schrift/CSS/JS-Datei)
// mit einem Fehler antworten. Die Seite wird bis ganz nach unten gescrollt,
// damit auch lazy geladene Bilder angefordert werden.
//
// Läuft im Workflow gh-pages.yml nach dem Deploy (Playwright wird dort
// temporär installiert, das Skript daneben kopiert).
//
// Aufruf: node vorschau-bilder-pruefen.mjs https://hagen381.github.io/website_dlizkfi / /episodes/ …
//
// Vorübergehende Fehler (5xx, 429, Verbindungsabbruch) — GitHub Pages liefert
// direkt nach dem Deploy gelegentlich kurz 503 oder bricht ab — werden bis zu
// 3× mit kurzer Pause (2 s, 4 s, 6 s) direkt neu angefragt und erst dann als
// Fehler gemeldet. Echte 404 (und andere 4xx) zählen sofort.

import { chromium } from "playwright";

const [basis, ...seiten] = process.argv.slice(2);
if (!basis || seiten.length === 0) {
  console.error("Aufruf: vorschau-bilder-pruefen.mjs <basis-url> <pfad> [<pfad> …]");
  process.exit(2);
}

// Im GitHub-Runner das vorinstallierte Google Chrome (PW_KANAL=chrome, siehe
// scripts/playwright-installieren.sh), lokal Playwrights Chromium.
const browser = await chromium.launch(process.env.PW_KANAL ? { channel: process.env.PW_KANAL } : {});
let fehlerGesamt = 0;

const WIEDERHOLUNGEN = 3;
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
// 5xx und 429 gelten als vorübergehend, andere 4xx (404, 403 …) als echt
const voruebergehend = (st) => st >= 500 || st === 429;

// Fragt eine Datei direkt an; bei vorübergehenden Fehlern bis zu 3× erneut.
// schonGescheitert: Der Browser hat die Datei bereits einmal vergeblich
// angefragt — dann ist schon die erste direkte Anfrage Wiederholung Nr. 1.
// Ergebnis: { ok, status, wiederholt } (wiederholt = Anzahl Wiederholungen)
async function nachfragen(anfrage, u, schonGescheitert) {
  let st = "";
  let wiederholt = schonGescheitert ? 1 : 0;
  for (;;) {
    if (wiederholt > 0) await pause(2000 * wiederholt);
    const r = await anfrage.get(u, { timeout: 30000 }).catch((e) => ({ status: () => `keine Antwort (${e.message.split("\n")[0]})` }));
    st = r.status();
    if (typeof st === "number" && st < 400) return { ok: true, status: st, wiederholt };
    if ((typeof st === "number" && !voruebergehend(st)) || wiederholt >= WIEDERHOLUNGEN) return { ok: false, status: st, wiederholt };
    wiederholt++;
  }
}

for (const breite of [390, 1280]) {
  for (const pfad of seiten) {
    const url = basis.replace(/\/$/, "") + pfad;
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
    const page = await ctx.newPage();
    const bilder = new Map(); // url -> status
    const fehler = [];
    const hinweise = [];
    // Vorübergehende Fehler: url -> Beschreibung (werden unten wiederholt)
    const wiederholen = new Map();

    page.on("response", (r) => {
      const typ = r.request().resourceType();
      if (["image", "font", "stylesheet", "script"].includes(typ)) {
        if (typ === "image") bilder.set(r.url(), r.status());
        if (r.status() >= 400) {
          if (voruebergehend(r.status())) wiederholen.set(r.url(), `${r.status()} ${typ}`);
          else fehler.push(`${r.status()} ${typ} ${r.url()}`);
        }
      }
    });
    // Abgebrochene Anfragen (net::ERR_ABORTED) sind meist der Browser selbst:
    // Er wechselt beim Scrollen/Laden auf eine andere srcset-Größe und bricht
    // die alte Anfrage ab. Die werden unten direkt nachgeholt und nur dann als
    // Fehler gezählt, wenn der Server wirklich einen Fehler liefert.
    const abgebrochen = new Set();
    page.on("requestfailed", (r) => {
      const typ = r.resourceType();
      if (!["image", "font", "stylesheet", "script"].includes(typ)) return;
      const grund = r.failure()?.errorText ?? "";
      if (grund.includes("ERR_ABORTED")) abgebrochen.add(r.url());
      else wiederholen.set(r.url(), `FEHLGESCHLAGEN ${typ} (${grund})`);
    });

    // Die Seite selbst: bei vorübergehendem Fehler bis zu 3× neu laden
    let antwort = null;
    for (let versuch = 0; versuch <= WIEDERHOLUNGEN; versuch++) {
      if (versuch > 0) {
        await pause(2000 * versuch);
        fehler.length = 0;
        wiederholen.clear();
        bilder.clear();
      }
      antwort = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
      if (antwort && !voruebergehend(antwort.status())) break;
    }
    if (!antwort || antwort.status() >= 400) fehler.push(`Seite selbst: ${antwort?.status() ?? "keine Antwort"} ${url}`);

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

    // Zusätzlich: jedes angezeigte <img> muss geladen und dekodiert sein.
    // Ausgeblendete (display: none, z. B. Collage-Fotos unter 640 px) und
    // lazy-Bilder außerhalb des Sichtbereichs lädt der Browser gewollt nicht —
    // die werden direkt angefragt.
    const { kaputt: kaputtAlle, versteckt } = await page.evaluate(() => {
      const zeigt = (i) => i.getClientRects().length > 0;
      return {
        // kaputt: geladen, aber leer — oder nicht lazy und trotzdem nicht fertig
        kaputt: [...document.images].filter((i) => zeigt(i) && ((i.complete && i.naturalWidth === 0) || (!i.complete && i.loading !== "lazy"))).map((i) => i.currentSrc || i.src),
        // ausgeblendet oder lazy außerhalb des Sichtbereichs (z. B. waagerecht
        // gescrollte Leisten, hintere Karten einer Walze): direkt anfragen
        versteckt: [...document.images].filter((i) => !i.complete && (!zeigt(i) || i.loading === "lazy")).map((i) => i.currentSrc || i.src),
      };
    });
    // Nicht geladene Bilder, deren Anfrage vorübergehend scheiterte, kommen in
    // die Wiederholung; alle anderen (z. B. 200, aber leer/kaputt) sind Fehler.
    for (const k of kaputtAlle) {
      if (wiederholen.has(k)) continue;
      const st = bilder.get(k);
      if (st !== undefined && st >= 400 && !voruebergehend(st)) continue; // schon als 4xx gezählt
      fehler.push(`<img> nicht geladen: ${k}`);
    }
    for (const u of versteckt) abgebrochen.add(u);
    for (const u of abgebrochen) {
      if (wiederholen.has(u)) continue;
      const r = await nachfragen(page.request, u, false);
      if (!r.ok) fehler.push(`${r.status} (nach Abbruch direkt geprüft${r.wiederholt ? `, ${r.wiederholt}× wiederholt` : ""}) ${u}`);
      else if (r.wiederholt) hinweise.push(`${u} erst nach ${r.wiederholt}× Wiederholung ok`);
    }
    for (const [u, was] of wiederholen) {
      const r = await nachfragen(page.request, u, true);
      if (!r.ok) fehler.push(`${was} → ${r.status}${voruebergehend(Number(r.status)) || typeof r.status !== "number" ? ` auch nach ${r.wiederholt}× Wiederholung` : ""}: ${u}`);
      else hinweise.push(`${was} ${u} → nach ${r.wiederholt}× Wiederholung ${r.status}`);
    }
    const anzahlImg = await page.evaluate(() => document.images.length);

    const status = fehler.length ? "FEHLER" : "ok";
    console.log(`${status.padEnd(6)} ${String(breite).padStart(4)}px ${pfad}  — ${anzahlImg} <img>, ${bilder.size} Bildanfragen, ${fehler.length} Fehler${abgebrochen.size ? ` (${abgebrochen.size} vom Browser abgebrochen, direkt nachgeprüft)` : ""}`);
    for (const f of fehler) console.log(`         ${f}`);
    for (const h of hinweise) console.log(`         (vorübergehend) ${h}`);
    fehlerGesamt += fehler.length;
    await ctx.close();
  }
}

// Blogübersicht als Kachel-Raster (nur wenn /blog/ geprüft wird). In der
// Vorschau stehen Entwürfe („_“) mit drin, mit Marke „Entwurf“.
// Geprüft: alle Artikel als Link im HTML, Reihenfolge = Folgendatum (neueste
// zuerst), Datum je Kachel, Spalten 1/2/3 bei 360/390/820/1280/1440 px, alles
// im Bild, Polaroids nicht über dem Raster, kein Querscrollen, Kartenbilder
// geladen; ab 7 Artikeln Blättern (→, ?seite=2, Fokus, „2 / n“) und ?seite=2
// direkt, sonst keine Steuerung.
if (seiten.includes("/blog/")) {
  const fs = await import("node:fs");
  const pfadBasis = new URL(basis).pathname.replace(/\/$/, "");
  const folgenDatum = Object.fromEntries(JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen.map((f) => [f.slug, f.datum]));
  const dateien = fs.readdirSync("content/blog").filter((d) => d.endsWith(".md") && d.toLowerCase() !== "readme.md");
  const soll = dateien
    .map((d) => ({ slug: d.replace(/^_/, "").replace(/\.md$/, ""), entwurf: d.startsWith("_"), datum: folgenDatum[fs.readFileSync(`content/blog/${d}`, "utf8").match(/folge-slug:\s*"?([^"\n]+)"?/)?.[1]] || "" }))
    .sort((x, y) => y.datum.localeCompare(x.datum));
  const slugs = soll.map((a) => a.slug);
  const proSeite = 6;
  const seitenZahl = Math.ceil(soll.length / proSeite);
  const meld = (ok, text) => {
    console.log(`${ok ? "ok    " : "FEHLER"} ${text}`);
    if (!ok) fehlerGesamt++;
  };
  const html = await (await fetch(`${basis}/blog/`)).text();
  const imHtml = slugs.filter((sl) => html.includes(`href="${pfadBasis}/blog/${sl}/"`)).length;
  meld(imHtml === slugs.length, `/blog/ alle ${slugs.length} Artikel (inkl. Entwürfe) als Link im HTML (${imHtml})`);
  const zustand = (page) =>
    page.evaluate(() => {
      const sichtbar = [...document.querySelectorAll(".br-platz")].filter((l) => l.getClientRects().length > 0);
      const rects = sichtbar.map((l) => l.getBoundingClientRect());
      const bereich = document.querySelector(".br-bereich")?.getBoundingClientRect();
      const polas = [...document.querySelectorAll(".br-pola")].filter((p) => p.getClientRects().length > 0).map((p) => p.getBoundingClientRect());
      const bilder = [...document.querySelectorAll(".br-platz img")].filter((i) => i.getClientRects().length > 0);
      return {
        slugs: sichtbar.map((l) => l.querySelector("a").getAttribute("href").replace(/\/$/, "").split("/").pop()),
        alle: [...document.querySelectorAll(".br-platz")].map((l) => ({ slug: l.querySelector("a").getAttribute("href").replace(/\/$/, "").split("/").pop(), datum: l.querySelector("time")?.getAttribute("datetime"), entwurf: !!l.querySelector(".br-marke") })),
        spalten: new Set(rects.map((r) => Math.round(r.left))).size,
        imBild: rects.every((r) => r.left >= 0 && r.right <= innerWidth),
        polaUeberRaster: !!bereich && polas.some((p) => p.right > bereich.left && p.left < bereich.right && p.bottom > bereich.top && p.top < bereich.bottom),
        querScroll: document.documentElement.scrollWidth > innerWidth,
        steuerung: !!document.querySelector(".br-steuerung"),
        zaehler: document.querySelector(".br-zaehler")?.textContent.replace(/\s+/g, " ").trim() ?? "",
        fokus: document.activeElement?.closest?.(".br-platz")?.querySelector("a")?.getAttribute("href") ?? "",
        suche: location.search,
        geladen: bilder.filter((i) => i.complete && i.naturalWidth > 0).length,
        bilder: bilder.length,
      };
    });
  for (const breite of [360, 390, 820, 1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${basis}/blog/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 500) {
        scrollTo(0, y);
        await new Promise((ok) => setTimeout(ok, 120));
      }
    });
    await page.waitForLoadState("networkidle");
    let z = await zustand(page);
    if (breite === 360) {
      meld(JSON.stringify(z.alle.map((a) => a.slug)) === JSON.stringify(slugs), `/blog/ Reihenfolge nach Folgendatum: ${z.alle.map((a) => a.slug).join(", ")}`);
      meld(z.alle.every((a, i) => a.datum === soll[i].datum && a.entwurf === soll[i].entwurf), `/blog/ Datum je Kachel = Datum der Folge, Marke „Entwurf“ genau bei Entwürfen (${soll.filter((a) => a.entwurf).length})`);
    }
    const spaltenSoll = Math.min(breite >= 1024 ? 3 : breite >= 640 ? 2 : 1, soll.length);
    meld(z.spalten === spaltenSoll && JSON.stringify(z.slugs) === JSON.stringify(slugs.slice(0, proSeite)) && z.imBild && !z.polaUeberRaster && !z.querScroll, `${breite}px /blog/: ${z.slugs.length} Kacheln auf Seite 1, ${z.spalten} Spalte(n) (erwartet ${spaltenSoll}), alles im Bild, Polaroids nicht über dem Raster, kein Querscrollen`);
    meld(z.geladen === z.bilder, `${breite}px /blog/: ${z.geladen}/${z.bilder} Kartenbilder geladen`);
    if (seitenZahl > 1) {
      await page.locator(".br-pfeil[aria-label='Nächste Seite']").click();
      await page.waitForTimeout(700);
      await page.waitForLoadState("networkidle");
      z = await zustand(page);
      meld(JSON.stringify(z.slugs) === JSON.stringify(slugs.slice(proSeite, 2 * proSeite)) && z.suche === "?seite=2" && z.zaehler.endsWith(`2 / ${seitenZahl}`) && z.fokus.endsWith(`/blog/${slugs[proSeite]}/`) && z.imBild && !z.querScroll && z.geladen === z.bilder, `${breite}px /blog/: Blättern → Seite 2 (${z.slugs.join(", ")}), ${z.suche}, „${z.zaehler}“, Fokus auf erster Kachel, ${z.geladen}/${z.bilder} Bilder`);
      await page.goto(`${basis}/blog/?seite=2`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(500);
      z = await zustand(page);
      meld(JSON.stringify(z.slugs) === JSON.stringify(slugs.slice(proSeite, 2 * proSeite)) && z.zaehler.endsWith(`2 / ${seitenZahl}`), `${breite}px /blog/?seite=2 lädt Seite 2 direkt`);
    } else {
      meld(!z.steuerung, `${breite}px /blog/: ${soll.length} Artikel → keine Blätter-Steuerung`);
    }
    await ctx.close();
  }
}

await browser.close();
if (fehlerGesamt) {
  console.log(`\nBildprüfung FEHLGESCHLAGEN: ${fehlerGesamt} Fehler.`);
  process.exit(1);
}
console.log("\nBildprüfung ok: kein Bild, keine Schrift, kein CSS/JS mit Fehler.");
