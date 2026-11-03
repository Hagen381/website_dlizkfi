import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked, type Token } from "marked";
import { basePath, istVorschau } from "@/lib/base-path";

// Blogartikel: content/blog/<slug>.md mit Frontmatter
//   titel:        Überschrift des Artikels
//   folge-slug:   Slug der zugehörigen Folge (wie in content/folgen.json)
//   datum:        JJJJ-MM-TT
//   beschreibung: Meta-Description / Lead unter dem Titel / Teaser
// Bilder als eigener Absatz: ![Bildunterschrift](bilder/<slug>/datei.jpg)
//
// Dateien mit "_" am Anfang sind Entwürfe: live NIE sichtbar, nur im
// Vorschau-Build (GitHub Pages, noindex) — mit sichtbarer Entwurf-Markierung.
// README.md wird ignoriert.

export type ArtikelBild = { src: string; alt: string; width: number; height: number };
export type ArtikelBlock = { art: "html"; html: string } | ({ art: "bild" } & ArtikelBild);

export type Artikel = {
  slug: string;
  titel: string;
  folgeSlug: string | null;
  datum: string;
  beschreibung: string;
  bloecke: ArtikelBlock[];
  erstesBild: ArtikelBild | null;
  entwurf: boolean;
};

const ordner = path.join(process.cwd(), "content/blog");
const manifestDatei = path.join(process.cwd(), "src/generated/blog-bilder.json");

type Manifest = Record<string, { width: number; height: number; pfad: string }>;

function manifestLesen(): Manifest {
  if (!fs.existsSync(manifestDatei)) {
    throw new Error("src/generated/blog-bilder.json fehlt — vor dem Build läuft scripts/blog-bilder.mjs (npm run build / npm run dev).");
  }
  return JSON.parse(fs.readFileSync(manifestDatei, "utf8"));
}

// Interne Links (/episodes/…) brauchen in der Vorschau den basePath.
function linksMitBasePath(html: string) {
  if (!basePath) return html;
  return html.replace(/href="\/(?!\/)/g, `href="${basePath}/`);
}

function bloeckeBauen(inhalt: string, datei: string, manifest: Manifest): ArtikelBlock[] {
  const bloecke: ArtikelBlock[] = [];
  let puffer: Token[] = [];
  const pufferLeeren = () => {
    if (!puffer.length) return;
    const html = marked.parser(puffer as Parameters<typeof marked.parser>[0]);
    bloecke.push({ art: "html", html: linksMitBasePath(html) });
    puffer = [];
  };
  const tokens = marked.lexer(inhalt);
  for (const t of tokens) {
    const kinder = t.type === "paragraph" ? (t.tokens ?? []).filter((k) => !(k.type === "text" && !k.raw.trim())) : [];
    if (t.type === "paragraph" && kinder.length === 1 && kinder[0].type === "image") {
      const bild = kinder[0] as Token & { href: string; text: string };
      const rel = bild.href.replace(/^\.?\//, "");
      const eintrag = manifest[rel];
      if (!eintrag) throw new Error(`content/blog/${datei}: Bild fehlt oder wurde nicht vorbereitet: ${bild.href}`);
      pufferLeeren();
      bloecke.push({ art: "bild", src: eintrag.pfad, alt: bild.text, width: eintrag.width, height: eintrag.height });
    } else {
      if (JSON.stringify(t).includes('"type":"image"')) {
        throw new Error(`content/blog/${datei}: Bilder müssen als eigener Absatz stehen (nicht mitten im Text).`);
      }
      puffer.push(t);
    }
  }
  pufferLeeren();
  return bloecke;
}

function laden(): Artikel[] {
  if (!fs.existsSync(ordner)) return [];
  // Entwürfe ("_…") nur im Vorschau-Build — live werden sie gar nicht erst gelesen.
  const dateien = fs.readdirSync(ordner).filter((d) => d.endsWith(".md") && d.toLowerCase() !== "readme.md" && (istVorschau || !d.startsWith("_")));
  if (!dateien.length) return [];
  const manifest = manifestLesen();
  return dateien
    .map((datei) => {
      const entwurf = datei.startsWith("_");
      const { data, content } = matter(fs.readFileSync(path.join(ordner, datei), "utf8"));
      for (const feld of ["titel", "datum", "beschreibung"]) {
        if (!data[feld]) throw new Error(`content/blog/${datei}: Frontmatter-Feld "${feld}" fehlt.`);
      }
      const bloecke = bloeckeBauen(content, datei, manifest);
      const erstesBild = (bloecke.find((b) => b.art === "bild") as ArtikelBild | undefined) ?? null;
      return {
        slug: datei.replace(/^_/, "").replace(/\.md$/, ""),
        titel: String(data.titel),
        folgeSlug: data["folge-slug"] ? String(data["folge-slug"]) : null,
        datum: data.datum instanceof Date ? data.datum.toISOString().slice(0, 10) : String(data.datum),
        beschreibung: String(data.beschreibung),
        bloecke,
        erstesBild: erstesBild ? { src: erstesBild.src, alt: erstesBild.alt, width: erstesBild.width, height: erstesBild.height } : null,
        entwurf,
      };
    })
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

export const artikel: Artikel[] = laden();
export const hatBlog = artikel.length > 0;
export const artikelZurFolge = (folgeSlug: string) => artikel.find((a) => a.folgeSlug === folgeSlug) ?? null;

export function datumLesbar(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
}
