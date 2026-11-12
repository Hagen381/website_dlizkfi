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
// /episodes/ als 3D-Register (alle Folgen verlinkt im HTML, Walze, Fotos, nichts
// über den Rand bei 360/390/820/1280/1440 px), 301 der alten Blätteradressen,
// /about/ (Fotos, Rand, Querscrollen, Kontrast, kein noindex), Walze per
// Touch (390 px) und Mausrad (1280 px), vordere Karte mobil,
// /blog/ als Kachel-Raster (alle Artikel verlinkt, Reihenfolge/Datum,
// Kartenbilder, Spalten 1/2/3, nichts über den Rand, kein Querscrollen bei
// 360/390/820/1280/1440 px, Blättern ab 7 Artikeln, sonst keine Steuerung,
// Polaroids 0/0/0/4/8, keine Dopplung mit Kartenbildern, Kacheln ≥ 260 px),
// jeder veröffentlichte Artikel (Bilder, Bildunterschriften, Zur-Folge-Kasten),
// „Blog" in der Navigation, Kartenbilder, „Zur Podcastfolge"-Ziele, Sitemap,
// „Zum Blogartikel" auf der Folgenseite, 404 für /entwurf/, /entwurf/about/, /entwurf/folgen/,
// /entwurf/startseite/ und /entwurf/blog/
// (Entwürfe nur in der Vorschau), optional 404 für PRUEFE_404, alle
// Bilder/Schriften/CSS/JS ohne Fehler.

import { chromium } from "playwright";
import fs from "node:fs";

const basis = (process.argv[2] || "").replace(/\/$/, "");
const nurNeueste = process.argv.includes("--nur-neueste");
const artikel = fs.readdirSync("content/blog").filter((d) => d.endsWith(".md") && !d.startsWith("_") && d.toLowerCase() !== "readme.md");
// Im GitHub-Runner das vorinstallierte Google Chrome (PW_KANAL=chrome, siehe
// scripts/playwright-installieren.sh), lokal Playwrights Chromium.
const browser = await chromium.launch(process.env.PW_KANAL ? { channel: process.env.PW_KANAL } : {});
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
  // Ebenso Bilder außerhalb des sichtbaren Ausschnitts eines waagerecht
  // scrollbaren Bereichs (z. B. Themenreiter auf /episodes/ mobil) — die lädt
  // der Browser erst beim Wischen.
  const unvollstaendig = await pg.evaluate(() => {
    const imAusschnitt = (i) => {
      const b = i.getBoundingClientRect();
      for (let el = i.parentElement; el; el = el.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(el).overflowX)) continue;
        const r = el.getBoundingClientRect();
        if (b.right <= r.left || b.left >= r.right) return false;
      }
      return true;
    };
    return [...document.images].filter((i) => i.getClientRects().length > 0 && imAusschnitt(i) && (!i.complete || !i.naturalWidth)).map((i) => i.currentSrc || i.src);
  });
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
    // Blätterseiten gibt es seit 12.11.2026 nicht mehr: je EIN 301 auf /episodes/
    [`https://${host}/episodes/?page=2`, `https://${host}/episodes/`],
    [`https://${host}/episodes/page/2/`, `https://${host}/episodes/`],
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

// Folgenübersicht = 3D-Register: alle Folgen als Link im ausgelieferten HTML,
// je Breite Walze sichtbar, vordere Karte im Bild, Fotos geladen, nichts über
// den Rand, kein waagerechtes Scrollen.
const alleFolgen = JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen;
const epHtml = await (await fetch(basis + "/episodes/")).text();
const epImHtml = alleFolgen.filter((f) => epHtml.includes(`href="/episodes/${f.slug}/"`)).length;
pruefe(epImHtml === alleFolgen.length, `/episodes/ alle ${alleFolgen.length} Folgen-Links im ausgelieferten HTML (${epImHtml})`);
for (const breite of [360, 390, 820, 1280, 1440]) {
  const e = await seite("/episodes/", breite);
  const w = await e.pg.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const walze = r(".reg-walze"), vorn = r(".vorne .reg-karte");
    const sichtbar = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    // Mobil ist die Reiterleiste waagerecht wischbar: Fotos außerhalb ihres
    // sichtbaren Ausschnitts lädt der Browser (lazy) erst beim Wischen.
    const leiste = r(".reg-reiter");
    const imAusschnitt = (i) => { const b = i.getBoundingClientRect(); return !i.closest(".reg-reiter") || (b.right > leiste.left && b.left < leiste.right); };
    const fotos = [...document.querySelectorAll(".reg-walze img, .reg-reiter img, .reg-pola img")].filter((i) => sichtbar(i) && imAusschnitt(i));
    const polas = [...document.querySelectorAll(".reg-pola")].filter(sichtbar).map((p) => p.getBoundingClientRect());
    return {
      karten: document.querySelectorAll(".reg-karte").length,
      walze: !!walze && walze.height > 0,
      vornImBild: !!vorn && vorn.left >= 0 && vorn.right <= innerWidth,
      ueberRand: polas.filter((p) => p.left < -20 || p.right > innerWidth + 20).length,
      querScroll: document.documentElement.scrollWidth > innerWidth,
      geladen: fotos.filter((i) => i.complete && i.naturalWidth > 0).length,
      fotos: fotos.length,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()).join("|"),
    };
  });
  pruefe(w.walze && w.vornImBild && w.ueberRand === 0 && !w.querScroll && w.h1 === "Alle Folgen", `${breite}px /episodes/: Walze sichtbar, vordere Karte im Bild, nichts über den Rand, kein Querscrollen, H1 „${w.h1}“`);
  pruefe(w.karten === alleFolgen.length && w.geladen === w.fotos && e.kaputt.length === 0, `${breite}px /episodes/: ${w.karten} Karten, ${w.geladen}/${w.fotos} Fotos geladen ${e.kaputt.join(" | ")}`);
  await e.ctx.close();
}

// Themenreiter auf /episodes/ (content/themen.json): „Alle“ + jedes Thema mit
// Folgen, mit Anzahl; Filter per Klick (aria-pressed, ?thema=…, nur die Folgen
// des Themas), Laden mit ?thema=visum, nochmal klicken = alle. Suche „Schule“
// findet auch Homeschooling-/Onlineschule-Folgen. Folgenseite: Themen-Chips.
const themenDaten = JSON.parse(fs.readFileSync("content/themen.json", "utf8"));
const themenListe = (e) => (Array.isArray(e) ? e : e?.themen ?? []);
const anzahlThema = (k) => alleFolgen.filter((f) => themenListe(themenDaten.folgen[f.slug]).includes(k)).length;
const themenMitFolgen = Object.keys(themenDaten.themen).filter((k) => anzahlThema(k) > 0);
const zustand = (pg) =>
  pg.evaluate(() => ({
    reiter: [...document.querySelectorAll(".reg-reiter-knopf")].map((b) => b.querySelector(".reg-reiter-text")?.textContent.trim()),
    gedrueckt: [...document.querySelectorAll(".reg-reiter-knopf[aria-pressed='true']")].map((b) => b.querySelector(".reg-reiter-text")?.textContent.trim()),
    karten: document.querySelectorAll(".reg-platz:not(.aus)").length,
    vorn: !!document.querySelector(".reg-platz:not(.aus).vorne"),
    fotos: [...document.querySelectorAll(".reg-platz.nah:not(.aus):not(.weg) .reg-foto-bild")].map((i) => i.complete && i.naturalWidth > 0),
    querScroll: document.documentElement.scrollWidth > innerWidth,
    suche: location.search,
    // Reiter dürfen die Walze nicht überdecken (mobil darüber, Desktop links daneben)
    frei: (() => { const n = document.querySelector(".reg-reiter").getBoundingClientRect(), w = document.querySelector(".reg-walze").getBoundingClientRect(); return n.bottom <= w.top + 1 || n.right <= w.left + 1; })(),
  }));
const visumLabel = themenDaten.themen.visum;
for (const breite of [390, 1280]) {
  const e = await seite("/episodes/", breite);
  let z = await zustand(e.pg);
  pruefe(z.reiter.length === themenMitFolgen.length + 1 && z.reiter[0] === "Alle" && z.gedrueckt.join() === "Alle" && z.karten === alleFolgen.length && z.frei, `${breite}px /episodes/: ${z.reiter.length} Themenreiter (erwartet ${themenMitFolgen.length + 1}), aktiv „${z.gedrueckt.join()}“, ${z.karten} Folgen, Reiter ${z.frei ? "neben/über" : "ÜBER"} der Walze`);
  await e.pg.locator(".reg-reiter-knopf", { hasText: visumLabel }).click();
  await e.pg.waitForTimeout(900);
  z = await zustand(e.pg);
  pruefe(z.gedrueckt.join() === visumLabel && z.karten === anzahlThema("visum") && z.vorn && z.suche === "?thema=visum" && z.fotos.every(Boolean) && !z.querScroll, `${breite}px /episodes/: Klick „${visumLabel}“ → ${z.karten} Folgen (erwartet ${anzahlThema("visum")}), Adresse ${z.suche}, ${z.fotos.filter(Boolean).length}/${z.fotos.length} Fotos`);
  await e.pg.locator(".reg-reiter-knopf", { hasText: visumLabel }).click();
  await e.pg.waitForTimeout(400);
  z = await zustand(e.pg);
  pruefe(z.gedrueckt.join() === "Alle" && z.karten === alleFolgen.length && z.suche === "", `${breite}px /episodes/: nochmal klicken → wieder alle ${z.karten} Folgen`);
  await e.ctx.close();
  const g = await seite("/episodes/?thema=visum", breite);
  await g.pg.waitForTimeout(900);
  z = await zustand(g.pg);
  pruefe(z.gedrueckt.join() === visumLabel && z.karten === anzahlThema("visum") && z.fotos.every(Boolean) && !z.querScroll && g.kaputt.length === 0, `${breite}px /episodes/?thema=visum lädt gefiltert: ${z.karten} Folgen, ${z.fotos.filter(Boolean).length}/${z.fotos.length} Fotos ${g.kaputt.join(" | ")}`);
  await g.ctx.close();
}
// Walze bedienen (seit 12.11.2026): Wischen per Touch bei 390 px — kurzer
// Wisch genau +1, zu kurzer bleibt, zurück −1, langer schneller höchstens +3,
// danach sauber eingerastet (Vielfaches von 24°); Mausrad bei 1280 px = +1
// pro Raststufe, Trackpad-Schwung höchstens +1. Vordere Karte < 640 px volle
// Breite, Titel nicht abgeschnitten, Knöpfe ≥ 44 px und nicht verdeckt,
// ↑ ↓ ≥ 48 px mit Abstand; keine Monatsschilder mehr.
{
  const vorne = (pg) => pg.evaluate(() => [...document.querySelectorAll(".reg-platz:not(.aus)")].findIndex((l) => l.classList.contains("vorne")));
  const eingerastet = (pg) => pg.evaluate(() => { const z = document.querySelector(".reg-zylinder"); const m = z.style.transform.match(/rotateX\((-?[\d.]+)deg\)/); return !z.classList.contains("zieht") && !!m && Number(m[1]) % 24 === 0; });
  // Touch-Wisch in der Seite (genaue Zeitabstände)
  const wisch = async (pg, x, y0, dy, dauer) => {
    await pg.evaluate(async ([x, y0, dy, dauer]) => {
      const el = document.elementFromPoint(x, y0);
      const t = (y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y + scrollY });
      const feuer = (typ, y, an) => el.dispatchEvent(new TouchEvent(typ, { bubbles: true, cancelable: true, touches: an ? [t(y)] : [], targetTouches: an ? [t(y)] : [], changedTouches: [t(y)] }));
      feuer("touchstart", y0, true);
      for (let i = 1; i <= 12; i++) { await new Promise((r) => setTimeout(r, dauer / 12)); feuer("touchmove", y0 + (dy * i) / 12, true); }
      feuer("touchend", y0 + dy, false);
    }, [x, y0, dy, dauer]);
    await pg.waitForTimeout(700);
  };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  await pg.goto(basis + "/episodes/", { waitUntil: "networkidle", timeout: 60000 });
  const w0 = await pg.locator(".reg-walze").boundingBox();
  await pg.evaluate((y) => scrollTo(0, y - 80), w0.y);
  await pg.waitForTimeout(300);
  const w = await pg.locator(".reg-walze").boundingBox();
  const x = w.x + w.width / 2, y = w.y + 420;
  const faelle = [["kurzer Wisch 80 px", -80, 300, [1, 1]], ["zu kurz 30 px", -30, 150, [0, 0]], ["zurück 80 px", 80, 250, [-1, -1]], ["kurz und schnell 120 px/80 ms", -120, 80, [1, 1]], ["lang und schnell 420 px/120 ms", -420, 120, [2, 3]]];
  for (const [name, dy, ms, [min, max]] of faelle) {
    const vor = await vorne(pg);
    await wisch(pg, x, dy > 0 ? y - 200 : y, dy, ms);
    const d = (await vorne(pg)) - vor;
    pruefe(d >= min && d <= max && (await eingerastet(pg)), `390px /episodes/ Touch ${name}: ${d >= 0 ? "+" : ""}${d} (erwartet ${min === max ? min : `${min}…${max}`}), eingerastet`);
  }
  const k = await pg.evaluate(() => {
    const r = document.querySelector(".vorne .reg-karte").getBoundingClientRect();
    const t = document.querySelector(".vorne .reg-titel");
    const knoepfe = [...document.querySelectorAll(".vorne .reg-knopf")].map((kn) => { const b = kn.getBoundingClientRect(); return { h: b.height, frei: kn.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)) }; });
    const st = [...document.querySelectorAll(".reg-steuerung button")].map((b) => b.getBoundingClientRect());
    return { breite: r.width, platz: innerWidth - 32, titelGanz: t.scrollHeight <= t.clientHeight + 1, knoepfe, pfeile: st.map((b) => Math.min(b.width, b.height)), abstand: st[1].left - st[0].right, fahnen: document.querySelectorAll(".reg-fahne").length, quer: document.documentElement.scrollWidth > innerWidth };
  });
  pruefe(k.breite >= k.platz - 2 && k.titelGanz && k.knoepfe.length > 0 && k.knoepfe.every((b) => b.h >= 44 && b.frei) && k.pfeile.every((g) => g >= 48) && k.abstand >= 16 && k.fahnen === 0 && !k.quer, `390px /episodes/: vordere Karte ${Math.round(k.breite)} px breit (Platz ${k.platz}), Titel ${k.titelGanz ? "ganz" : "ABGESCHNITTEN"}, Knöpfe ${k.knoepfe.map((b) => `${Math.round(b.h)} px${b.frei ? "" : " VERDECKT"}`).join("/")}, ↑ ↓ ${k.pfeile.map(Math.round).join("/")} px, Abstand ${Math.round(k.abstand)} px, Monatsschilder ${k.fahnen}${k.quer ? ", QUERSCROLLEN" : ""}`);
  await ctx.close();
  const m = await seite("/episodes/", 1280);
  await m.pg.evaluate(() => scrollTo(0, document.querySelector(".reg-walze").getBoundingClientRect().top + scrollY - 100));
  await m.pg.waitForTimeout(300);
  const mb2 = await m.pg.locator(".reg-walze").boundingBox();
  await m.pg.mouse.move(mb2.x + mb2.width / 2, mb2.y + 200);
  const a0 = await vorne(m.pg);
  await m.pg.mouse.wheel(0, 100); await m.pg.waitForTimeout(400);
  const a1 = await vorne(m.pg);
  await m.pg.mouse.wheel(0, 100); await m.pg.waitForTimeout(400);
  const a2 = await vorne(m.pg);
  for (let i = 0; i < 40; i++) { await m.pg.mouse.wheel(0, 6); await m.pg.waitForTimeout(16); }
  await m.pg.waitForTimeout(400);
  const a3 = await vorne(m.pg);
  pruefe(a1 - a0 === 1 && a2 - a1 === 1 && a3 - a2 <= 1 && (await eingerastet(m.pg)), `1280px /episodes/ Mausrad: ${a0} → ${a1} → ${a2} (je +1 pro Raststufe), Trackpad-Schwung +${a3 - a2} (≤ 1)`);
  await m.ctx.close();
}
const su = await seite("/episodes/?q=Schule", 390);
await su.pg.waitForSelector("section[aria-live] li", { timeout: 15000 }).catch(() => {});
const suTitel = await su.pg.locator("section[aria-live] li h2").allInnerTexts();
pruefe(suTitel.some((t) => /home ?schooling/i.test(t)) && suTitel.some((t) => /onlineschule/i.test(t)) && /schule/i.test(suTitel[0] || ""), `/episodes/?q=Schule: ${suTitel.length} Treffer, erster „${suTitel[0] || "-"}“, Homeschooling und Onlineschule dabei`);
await su.ctx.close();
const chipFolge = alleFolgen.find((f) => themenListe(themenDaten.folgen[f.slug]).length);
const chipHtml = await (await fetch(`${basis}/episodes/${chipFolge.slug}/`)).text();
const chips = themenListe(themenDaten.folgen[chipFolge.slug]).filter((k) => chipHtml.includes(`href="/episodes/?thema=${k}"`));
pruefe(chips.length === themenListe(themenDaten.folgen[chipFolge.slug]).length, `/episodes/${chipFolge.slug}/: Themen-Chips ${chips.join(", ")}`);

const blog = await seite("/blog/");
pruefe(blog.status === 200, `/blog/ HTTP ${blog.status}`);
// Raster: jede Kachel ist EIN echter Link im ausgelieferten HTML
const karten = await blog.pg.locator("main .br-link").count();
pruefe(karten === artikel.length, `/blog/ hat ${karten} Kachel(n), veröffentlicht: ${artikel.length}`);
const html = await (await fetch(basis + "/blog/")).text();
const imHtml = artikel.filter((d) => html.includes(`href="/blog/${d.replace(/\.md$/, "")}/"`)).length;
pruefe(imHtml === artikel.length, `/blog/ alle ${artikel.length} Artikel-Links im ausgelieferten HTML (${imHtml})`);
// Reihenfolge = Erscheinungsdatum der Folge (neueste zuerst), Datum auf jeder Karte
const folgenDaten = Object.fromEntries(JSON.parse(fs.readFileSync("content/folgen.json", "utf8")).folgen.map((f) => [f.slug, f.datum]));
const erwartet = artikel
  .map((d) => ({ slug: d.replace(/\.md$/, ""), datum: folgenDaten[fs.readFileSync(`content/blog/${d}`, "utf8").match(/folge-slug:\s*"?([^"\n]+)"?/)?.[1]] || "" }))
  .sort((x, y) => y.datum.localeCompare(x.datum));
const reihe = await blog.pg.locator("main .br-link").evaluateAll((as) => as.map((x) => x.getAttribute("href").replace(/\/$/, "").split("/").pop()));
pruefe(JSON.stringify(reihe) === JSON.stringify(erwartet.map((e) => e.slug)), `/blog/ Reihenfolge nach Folgendatum: ${reihe.join(", ")}`);
const kartenDaten = await blog.pg.locator("main .br-link time").evaluateAll((ts) => ts.map((t) => t.getAttribute("datetime")));
pruefe(JSON.stringify(kartenDaten) === JSON.stringify(erwartet.map((e) => e.datum)), `/blog/ Datum auf jeder Karte = Datum der Folge`);
pruefe(blog.kaputt.length === 0, `/blog/ ohne Bildfehler ${blog.kaputt.join(" | ")}`);
for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  const mdText = fs.readFileSync(`content/blog/${datei}`, "utf8");
  // Kartenbild aus dem Frontmatter, sonst das erste Bild im Artikel
  const erstes = (mdText.match(/^kartenbild:\s*"?([^"\n]+?)"?\s*$/m)?.[1] || mdText.match(/!\[[^\]]*\]\(bilder\/[^/]+\/([^)]+)\)/i)?.[1] || "").replace(/\.[a-z]+$/i, "") || null;
  if (!erstes) continue;
  const karte = blog.pg.locator(`main a.br-link[href$="/blog/${slug}/"]`);
  const src = (await karte.locator("img").first().getAttribute("srcset").catch(() => null)) || (await karte.locator("img").first().getAttribute("src").catch(() => "")) || "";
  pruefe(src.includes(erstes), `/blog/ Karte ${slug} zeigt Kartenbild ${erstes}`);
}
await blog.ctx.close();

// Raster je Breite: Spalten (1 / 2 / 3), Seite 1 mit bis zu 6 Kacheln, alle
// im Bild, nichts über den Rand, kein Querscrollen, Polaroids nie über dem
// Raster, angezeigte Kartenbilder geladen. Blättern (ab 7 Artikeln): → zeigt
// Seite 2, ?seite=2, Fokus auf deren erster Kachel, „2 / n“; ?seite=2 lädt
// direkt Seite 2. Bis 6 Artikel: keine Steuerung.
const proSeite = 6;
const seitenZahl = Math.ceil(artikel.length / proSeite);
const rasterZustand = (pg) =>
  pg.evaluate(() => {
    const sichtbar = [...document.querySelectorAll(".br-platz")].filter((l) => l.getClientRects().length > 0);
    const rects = sichtbar.map((l) => l.getBoundingClientRect());
    const bereich = document.querySelector(".br-bereich")?.getBoundingClientRect();
    const polas = [...document.querySelectorAll(".br-pola")].filter((p) => p.getClientRects().length > 0).map((p) => p.getBoundingClientRect());
    const bilder = [...document.querySelectorAll(".br-platz img")].filter((i) => i.getClientRects().length > 0);
    return {
      slugs: sichtbar.map((l) => l.querySelector("a").getAttribute("href").replace(/\/$/, "").split("/").pop()),
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
      // Polaroids: Anzahl je Seite, schmalste Kachel, Fotos (Dateiname vor
      // „-opt-“) von Polaroids und Kartenbildern, ausgeblendete nicht geladen
      polasSichtbar: polas.length,
      kachelMin: Math.round(Math.min(...rects.map((r) => r.width))),
      polaFotos: [...document.querySelectorAll(".br-pola img")].map((i) => (i.getAttribute("srcset") || i.getAttribute("src") || "").split(",")[0].trim().split(" ")[0].split("/").pop().replace(/-opt-\d+\.\w+$/i, "").replace(/\.\w+$/, "")),
      kartenFotos: [...document.querySelectorAll(".br-platz img")].map((i) => (i.getAttribute("srcset") || i.getAttribute("src") || "").split(",")[0].trim().split(" ")[0].split("/").pop().replace(/-opt-\d+\.\w+$/i, "").replace(/\.\w+$/, "")),
      // ausgeblendete Polaroids (display: none, lazy) lädt der Browser nicht
      versteckteGeladen: [...document.querySelectorAll(".br-pola img")].filter((i) => i.getClientRects().length === 0 && (i.currentSrc || (i.complete && i.naturalWidth > 0))).length,
    };
  });
const folgenQuellen = JSON.parse(fs.readFileSync("content/folgen-bilder/quellen.json", "utf8"));
const kameraName = (n) => (folgenQuellen[n] ?? n).replace(/\.\w+$/, "");
const reiheSlugs = erwartet.map((e) => e.slug);
for (const breite of [360, 390, 820, 1280, 1440]) {
  const b = await seite("/blog/", breite);
  const k = await rasterZustand(b.pg);
  const spaltenSoll = Math.min(breite >= 1024 ? 3 : breite >= 640 ? 2 : 1, artikel.length);
  pruefe(k.spalten === spaltenSoll && JSON.stringify(k.slugs) === JSON.stringify(reiheSlugs.slice(0, proSeite)) && k.imBild && !k.polaUeberRaster && !k.querScroll, `${breite}px /blog/: ${k.slugs.length} Kacheln auf Seite 1, ${k.spalten} Spalte(n) (erwartet ${spaltenSoll}), alles im Bild, Polaroids nicht über dem Raster, kein Querscrollen`);
  pruefe(k.geladen === k.bilder && b.kaputt.length === 0, `${breite}px /blog/: ${k.geladen}/${k.bilder} Kartenbilder geladen ${b.kaputt.join(" | ")}`);
  // Polaroids: unter 1280 px keine, 1280–1439 px zwei je Seite, ab 1440 px vier;
  // ausgeblendete nicht geladen; Kacheln ab 1024 px mindestens 260 px breit;
  // kein Polaroid zeigt dasselbe Foto wie ein Kartenbild
  const polaSoll = breite >= 1440 ? 8 : breite >= 1280 ? 4 : 0;
  const doppelt = k.polaFotos.map(kameraName).filter((n) => k.kartenFotos.map(kameraName).includes(n));
  pruefe(k.polasSichtbar === polaSoll && k.versteckteGeladen === 0 && (breite < 1024 || k.kachelMin >= 260) && doppelt.length === 0, `${breite}px /blog/: ${k.polasSichtbar} Polaroids (erwartet ${polaSoll}), ausgeblendete nicht geladen, schmalste Kachel ${k.kachelMin} px, Dopplung Polaroid/Kartenbild: ${doppelt.join(", ") || "keine"}`);
  if (seitenZahl > 1 && (breite === 390 || breite === 1280)) {
    await b.pg.locator(".br-pfeil[aria-label='Nächste Seite']").click();
    await b.pg.waitForTimeout(600);
    const z = await rasterZustand(b.pg);
    pruefe(JSON.stringify(z.slugs) === JSON.stringify(reiheSlugs.slice(proSeite, 2 * proSeite)) && z.suche === "?seite=2" && z.zaehler.endsWith(`2 / ${seitenZahl}`) && z.fokus.endsWith(`/blog/${reiheSlugs[proSeite]}/`) && !z.querScroll, `${breite}px /blog/: Blättern → Seite 2 (${z.slugs.join(", ")}), ${z.suche}, „${z.zaehler}“, Fokus auf erster Kachel`);
  } else if (seitenZahl <= 1) {
    pruefe(!k.steuerung, `${breite}px /blog/: ${artikel.length} Artikel → keine Blätter-Steuerung`);
  }
  await b.ctx.close();
  if (seitenZahl > 1 && (breite === 390 || breite === 1280)) {
    const d = await seite("/blog/?seite=2", breite);
    const z = await rasterZustand(d.pg);
    pruefe(JSON.stringify(z.slugs) === JSON.stringify(reiheSlugs.slice(proSeite, 2 * proSeite)) && z.zaehler.endsWith(`2 / ${seitenZahl}`) && z.geladen === z.bilder, `${breite}px /blog/?seite=2 lädt Seite 2 direkt (${z.slugs.length} Kachel(n), ${z.geladen}/${z.bilder} Bilder)`);
    await d.ctx.close();
  }
}

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
    if (folge && breite === 390) {
      const sollChips = themenListe(themenDaten.folgen[folge]);
      const chipZiele = await a.pg.locator("nav[aria-label='Themen dieser Folge'] a").evaluateAll((as) => as.map((x) => x.getAttribute("href")));
      pruefe(sollChips.length > 0 && sollChips.every((k) => chipZiele.some((h) => h.endsWith(`/episodes/?thema=${k}`))), `Artikel /blog/${slug}/: Themen-Chips ${sollChips.join(", ")}`);
    }
    await a.ctx.close();
  }
  if (folge) {
    const f = await seite(`/episodes/${folge}/`);
    pruefe((await f.pg.locator(`a[href$="/blog/${slug}/"]`, { hasText: "Zum Blogartikel" }).count()) === 1, `Folgenseite /episodes/${folge}/ verlinkt „Zum Blogartikel“`);
    await f.ctx.close();
    // Walze auf /episodes/: Karte der Folge zeigt das Kartenbild des Artikels
    const kb = (md.match(/^kartenbild:\s*"?([^"\n]+?)"?\s*$/m)?.[1] || md.match(/!\[[^\]]*\]\(bilder\/[^/]+\/([^)]+)\)/i)?.[1] || "").replace(/\.[a-z]+$/i, "");
    const karte = epHtml.split('<article class="reg-karte"').find((t) => t.includes(`href="/episodes/${folge}/"`)) || "";
    pruefe(!!kb && karte.includes(kb), `/episodes/: Walzen-Karte ${folge} zeigt Kartenbild ${kb}`);
  }
  // Suche auf /episodes/ (Index /suche.json) findet den Artikel über seinen Titel
  const idx = await (await fetch(basis + "/suche.json")).json();
  pruefe(idx.some((e) => e.art === "artikel" && e.slug === slug), `/suche.json enthält Artikel ${slug}`);
}
// Sitemap enthält jeden veröffentlichten Artikel
const sitemap = await (await fetch(basis + "/sitemap.xml")).text();
for (const datei of artikel) {
  const slug = datei.replace(/\.md$/, "");
  pruefe(sitemap.includes(`/blog/${slug}/</loc>`), `sitemap.xml enthält /blog/${slug}/`);
}

// Über-Seite /about/ (live seit 12.11.2026, vorher /entwurf/about/): je
// Breite alle angezeigten Fotos geladen, nichts über den Rand, kein
// Querscrollen, H1, „Über“ aktiv, kein noindex, Canonical /about/; Kontrast
// des Fließtexts (Glasflächen) gegen deren Hintergrund ≥ 4,5:1.
for (const breite of [360, 390, 820, 1280, 1440]) {
  const u = await seite("/about/", breite);
  const z = await u.pg.evaluate(() => {
    const sichtbar = (el) => el.getClientRects().length > 0;
    const fotos = [...document.querySelectorAll(".ab-pola img")].filter(sichtbar);
    const polas = [...document.querySelectorAll(".ab-pola")].filter(sichtbar).map((p) => p.getBoundingClientRect());
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    // Hintergrund: erste Fläche mit deckender Farbe nach oben, mit Seitengrund gemischt
    const grund = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0) { const a = c[3] ?? 1; const s = [254, 252, 232]; return c.slice(0, 3).map((v, i) => v * a + s[i] * (1 - a)); } } return [254, 252, 232]; };
    const kontraste = [...document.querySelectorAll(".ab-lesen p, .ab-moderation, .ab-titel, .ab-irgendwann span, .ab-anhoeren-titel")].filter(sichtbar).map((el) => { const v = lum(rgb(getComputedStyle(el).color)), h = lum(grund(el)); return (Math.max(v, h) + 0.05) / (Math.min(v, h) + 0.05); });
    return {
      geladen: fotos.filter((i) => i.complete && i.naturalWidth > 0).length,
      fotos: fotos.length,
      ueberRand: polas.filter((p) => p.left < -2 || p.right > innerWidth + 2).length,
      querScroll: document.documentElement.scrollWidth > innerWidth,
      h1: document.querySelector("h1")?.textContent.trim(),
      aktiv: [...document.querySelectorAll('body > header [aria-current="page"]')].map((a) => a.textContent.trim()).join(),
      noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
      minKontrast: Math.min(...kontraste),
      balken: document.body.textContent.includes("Entwurf – nicht live"),
    };
  });
  pruefe(u.status === 200 && z.geladen === z.fotos && z.fotos > 0 && z.ueberRand === 0 && !z.querScroll && u.kaputt.length === 0, `${breite}px /about/: ${z.geladen}/${z.fotos} Fotos geladen, nichts über den Rand, kein Querscrollen ${u.kaputt.join(" | ")}`);
  pruefe(/^Über /.test(z.h1 || "") && z.aktiv.includes("Über") && !z.noindex && !z.balken && z.canonical.endsWith("/about/") && z.minKontrast >= 4.5, `${breite}px /about/: H1 „${z.h1}“, „Über“ aktiv, kein noindex, kein Entwurf-Balken, Canonical /about/, Kontrast min. ${z.minKontrast.toFixed(2)}:1`);
  await u.ctx.close();
}

// Entwürfe gibt es nur in der Vorschau (scripts/entwuerfe.mjs) — live immer 404.
// /entwurf/blog/ ist seit 12.11.2026 /blog/ und bleibt live ebenfalls 404.
for (const pfad of ["/entwurf/about/", "/entwurf/blog/", "/entwurf/folgen/", "/entwurf/startseite/", "/entwurf/"]) {
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
