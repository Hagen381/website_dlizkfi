// Links in den Shownotes lesbar machen (läuft in scripts/feed-holen.mjs nach
// der Bereinigung, gilt damit für jede neue Folge automatisch). Der Feed bei
// Spotify bleibt unverändert, das betrifft nur unsere Darstellung.
//
// 0. Nackte URLs im Text (ohne Link) werden zuerst zu Links, damit für sie
//    dieselben Regeln gelten.
// 1. Link auf unsere eigene Domain mit nackter URL als Text: ganz entfernen
//    (zeigt auf die Seite selbst).
// 2. Zeile „Bezeichnung: <a>URL</a>" (auch fett, mit Emoji davor):
//    die Bezeichnung wird der Link, URL und Doppelpunkt entfallen.
//    „<strong>Spotify:</strong> <a href=X>https://…</a>"
//      → „<strong><a href=X>Spotify</a></strong>"
// 3. Jeder übrige Link, dessen Text eine nackte URL ist: Text = Domain (+ Pfad,
//    wenn kurz) ohne https:// und www, z. B. „instagram.com/molloycrew".

const EIGENE_DOMAIN = /(^|\.)daslebenistzukurzfuerirgendwann\.de$/i;
const istUrlText = (t) => /^\s*(https?:\/\/|www\.)\S+\s*$/i.test(t);

function url(href) {
  try {
    return new URL(/^https?:\/\//i.test(href) ? href : `https://${href}`);
  } catch {
    return null;
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Für Linktext: Host ohne www, dazu der Pfad, solange das Ganze kurz bleibt.
export function kurzeAdresse(href) {
  const u = url(href.replace(/&amp;/g, "&"));
  if (!u) return esc(href.replace(/^https?:\/\//i, "").replace(/^www\./i, ""));
  const host = u.hostname.replace(/^www\./i, "");
  let pfad = u.pathname.replace(/\/+$/, "");
  try {
    pfad = decodeURIComponent(pfad);
  } catch {}
  return esc(host + pfad).length <= 40 ? esc(host + pfad) : esc(host);
}

// Bezeichnung = kurz (bis 3 Wörter, 30 Zeichen), kein ganzer Satz.
const istBezeichnung = (t) => t.length <= 30 && t.trim().split(/\s+/).length <= 3;

// URLs im Fließtext verlinken (nur Text außerhalb von Tags und <a>…</a>).
function urlsVerlinken(html) {
  return html
    .split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/)
    .map((teil) => {
      if (teil.startsWith("<")) return teil;
      return teil.replace(/(https?:\/\/|www\.)[^\s<>"]+/gi, (u) => {
        const rest = u.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
        const kern = rest ? u.slice(0, -rest.length) : u;
        const href = /^www\./i.test(kern) ? `https://${kern}` : kern;
        return `<a href="${href}" target="_blank" rel="noopener">${kern}</a>${rest}`;
      });
    })
    .join("");
}

export function linksAufraeumen(html) {
  let h = urlsVerlinken(html);

  // 1. Eigene Domain
  h = h.replace(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g, (ganz, href, text) => {
    const u = url(href.replace(/&amp;/g, "&"));
    return u && EIGENE_DOMAIN.test(u.hostname) && istUrlText(text) ? "" : ganz;
  });

  // 2. „Bezeichnung: <a>URL</a>" als ganze Zeile (nach <p> oder <br />, bis </p> oder <br />)
  const zeile =
    /(<p>|<br \/>)(\s*)([^<\p{L}\p{N}]*)(<strong>)?([\p{L}\p{N}][^<:]*?)(?:\s*:\s*<\/strong>|<\/strong>\s*:|\s*:)\s*<a href="([^"]*)"([^>]*)>([^<]*)<\/a>\s*(?=<\/p>|<br \/>)/gu;
  h = h.replace(zeile, (ganz, anfang, ws, vor, fett, bez, href, rest, text) => {
    if (!istUrlText(text) || !istBezeichnung(bez)) return ganz;
    const link = `<a href="${href}"${rest}>${bez.trim()}</a>`;
    return `${anfang}${ws}${vor}${fett ? `<strong>${link}</strong>` : link}`;
  });

  // 3. Übrige nackte URLs als Linktext
  h = h.replace(/(.?)<a href="([^"]*)"([^>]*)>([^<]*)<\/a>(.?)/gs, (ganz, davor, href, rest, text, danach) => {
    if (!istUrlText(text)) return ganz;
    const l = /[\p{L}\p{N}]/u.test(davor) ? " " : "";
    const r = /[\p{L}\p{N}(]/u.test(danach) ? " " : "";
    return `${davor}${l}<a href="${href}"${rest}>${kurzeAdresse(href)}</a>${r}${danach}`;
  });

  // Aufräumen: leere Absätze und <br /> am Absatzende
  return h
    .replace(/(\s*<br \/>)+\s*<\/p>/g, "</p>")
    .replace(/<p>\s*(<br \/>\s*)*<\/p>/g, "")
    .trim();
}
