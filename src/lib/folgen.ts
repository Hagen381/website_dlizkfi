import daten from "../../content/folgen.json";
import { siteConfig } from "@/lib/site-config";

export type Folge = {
  slug: string;
  guid: string;
  titel: string;
  datum: string;
  dauer: number | null;
  mp3: string | null;
  mp3Bytes: number | null;
  mp3Typ: string;
  bild: string | null;
  nummer: number | null;
  typ: string;
  spotifyLink: string | null;
  beschreibung: string;
  shownotes: string;
};

// Neueste zuerst (so steht es auch in folgen.json).
export const folgen: Folge[] = [...(daten.folgen as Folge[])].sort((a, b) => b.datum.localeCompare(a.datum));

export const folgeNachSlug = (slug: string) => folgen.find((f) => f.slug === slug);

export const seitenAnzahl = Math.max(1, Math.ceil(folgen.length / siteConfig.folgenProSeite));

export function folgenAufSeite(seite: number) {
  const n = siteConfig.folgenProSeite;
  return folgen.slice((seite - 1) * n, seite * n);
}

// Seite 1 = /episodes/, ab Seite 2 /episodes/page/N/
export const seitenPfad = (seite: number) => (seite <= 1 ? "/episodes/" : `/episodes/page/${seite}/`);

export function nachbarn(slug: string) {
  const i = folgen.findIndex((f) => f.slug === slug);
  // Wie auf der Live-Seite: "Zurück" = neuere Folge, "Weiter" = ältere Folge
  return { aelter: folgen[i + 1] ?? null, neuer: i > 0 ? folgen[i - 1] : null };
}

const TZ = "Europe/Berlin";
// "2. Nov 2026" (Listen) — wie PodView: Punkt hinter dem Tag, keiner hinter dem Monat
export function datumKurz(iso: string) {
  const d = new Date(iso);
  const tag = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: TZ }).format(d);
  const monat = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: TZ }).format(d).replace(/\.$/, "");
  const jahr = new Intl.DateTimeFormat("de-DE", { year: "numeric", timeZone: TZ }).format(d);
  return `${tag}. ${monat} ${jahr}`;
}
// "2. November 2026" (Hero)
export const datumLang = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));

// 1963 -> "32:43", 3674 -> "1:01:14"
export function dauerText(s: number | null) {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  const zz = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${zz(m)}:${zz(sek)}` : `${m}:${zz(sek)}`;
}

// ISO-8601-Dauer für JSON-LD
export function dauerIso(s: number | null) {
  if (s == null) return undefined;
  return `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
}

// Für Bildschirmleser: "32 Minuten" / "1 Stunde 1 Minute"
export function dauerGesprochen(s: number | null) {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  const teile = [];
  if (h) teile.push(`${h} ${h === 1 ? "Stunde" : "Stunden"}`);
  teile.push(`${m} ${m === 1 ? "Minute" : "Minuten"}`);
  return teile.join(" ");
}
