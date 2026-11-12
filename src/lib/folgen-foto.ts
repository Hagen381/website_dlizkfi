import fs from "node:fs";
import path from "node:path";
import { artikelZurFolge } from "@/lib/blog";
import collage from "../../content/startseite/collage.json";

// „Foto zur Folge“ — EINE Stelle für alle Folgenkarten: /episodes/ (Walze,
// Themenreiter, Liste ohne JS), Suchtreffer (über /suche.json) und Startseite
// („Neueste Folge“, „Weitere Folgen“). Die Folgenseiten selbst behalten das
// Podcast-Cover.
//
// Reihenfolge:
//   1. Kartenbild des Blogartikels zur Folge (mit kartenbild-position)
//   2. content/folgen-bilder/<slug>.jpg (→ /images/folgen/<slug>.jpg, von
//      scripts/folgen-bilder.mjs ohne Metadaten vorbereitet)
//   3. Rückfall: ein Foto der Startseiten-Collage per FNV-1a-Hash des Slugs —
//      hängt nur vom eigenen Slug und der festen Fotoliste ab, ändert sich
//      also nicht, wenn neue Folgen dazukommen. Betrifft nur neue Folgen, für
//      die noch kein Bild nachgereicht ist (Hinweis im Build-Log).

export type FolgenFoto = { src: string; position: string };

const folgenBilder = new Set(
  (() => {
    const ordner = path.join(process.cwd(), "content/folgen-bilder");
    return fs.existsSync(ordner) ? fs.readdirSync(ordner).filter((d) => d.endsWith(".jpg")).map((d) => d.slice(0, -4)) : [];
  })(),
);

const collageFotos = collage.polaroids.map((p) => p.datei);
function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function fotoZurFolge(slug: string): FolgenFoto {
  const a = artikelZurFolge(slug);
  if (a?.kartenbild) return { src: a.kartenbild.src, position: a.kartenbildPosition };
  if (folgenBilder.has(slug)) return { src: `/images/folgen/${slug}.jpg`, position: "50% 50%" };
  return { src: `/images/startseite/${collageFotos[fnv1a(slug) % collageFotos.length]}`, position: "50% 50%" };
}
