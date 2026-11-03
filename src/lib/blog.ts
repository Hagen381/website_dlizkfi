import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// Blogartikel: content/blog/<slug>.md mit Frontmatter
//   titel:        Überschrift des Artikels
//   folge-slug:   Slug der zugehörigen Folge (wie in content/folgen.json)
//   datum:        JJJJ-MM-TT
//   beschreibung: Meta-Description / Teaser
// Dateien, die mit "_" beginnen, und README.md werden ignoriert.
export type Artikel = {
  slug: string;
  titel: string;
  folgeSlug: string | null;
  datum: string;
  beschreibung: string;
  html: string;
};

const ordner = path.join(process.cwd(), "content/blog");

function laden(): Artikel[] {
  if (!fs.existsSync(ordner)) return [];
  return fs
    .readdirSync(ordner)
    .filter((d) => d.endsWith(".md") && !d.startsWith("_") && d.toLowerCase() !== "readme.md")
    .map((datei) => {
      const { data, content } = matter(fs.readFileSync(path.join(ordner, datei), "utf8"));
      const slug = datei.replace(/\.md$/, "");
      for (const feld of ["titel", "datum", "beschreibung"]) {
        if (!data[feld]) throw new Error(`content/blog/${datei}: Frontmatter-Feld "${feld}" fehlt.`);
      }
      return {
        slug,
        titel: String(data.titel),
        folgeSlug: data["folge-slug"] ? String(data["folge-slug"]) : null,
        datum: data.datum instanceof Date ? data.datum.toISOString().slice(0, 10) : String(data.datum),
        beschreibung: String(data.beschreibung),
        html: marked.parse(content, { async: false }) as string,
      };
    })
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

export const artikel: Artikel[] = laden();
export const hatBlog = artikel.length > 0;
export const artikelZurFolge = (folgeSlug: string) => artikel.find((a) => a.folgeSlug === folgeSlug) ?? null;
