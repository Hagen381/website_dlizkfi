import { artikel } from "@/lib/blog";
import { folgen } from "@/lib/folgen";
import { fotoZurFolge } from "@/lib/folgen-foto";
import { themenZurFolge } from "@/lib/themen";

// Kleiner Suchindex für die Suche auf /episodes/ (wird erst beim Suchen
// geladen, src/components/FolgenSuche.tsx). Enthält Folgen (Titel, Themen,
// Shownotes) und Blogartikel (Titel, Beschreibung, Text) — keine Transkripte.
// Blogartikel live nur veröffentlichte (Entwürfe werden live gar nicht
// gelesen), in der Vorschau auch Entwürfe.
export const dynamic = "force-static";

const klartext = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

export function GET() {
  const folgenDaten = folgen.map(({ slug, titel, datum, dauer, mp3, beschreibung, shownotes }) => ({
    art: "folge" as const,
    slug,
    titel,
    datum,
    dauer,
    mp3,
    beschreibung,
    // Foto für die Trefferkarte (src/lib/folgen-foto.ts)
    foto: fotoZurFolge(slug),
    themen: themenZurFolge(slug).map((t) => t.label),
    // Klartext der Shownotes für die Volltextsuche
    text: klartext(shownotes),
  }));
  const artikelDaten = artikel.map((a) => ({
    art: "artikel" as const,
    slug: a.slug,
    titel: a.titel,
    datum: a.datum,
    beschreibung: a.beschreibung,
    entwurf: a.entwurf,
    foto: a.kartenbild ? { src: a.kartenbild.src, position: a.kartenbildPosition } : fotoZurFolge(a.folgeSlug),
    themen: themenZurFolge(a.folgeSlug).map((t) => t.label),
    text: klartext(a.bloecke.map((b) => (b.art === "html" ? b.html : b.alt)).join(" ")),
  }));
  return Response.json([...folgenDaten, ...artikelDaten]);
}
