import { folgen } from "@/lib/folgen";

// Kleiner Suchindex für die Suche auf /episodes/ (wird erst beim Suchen geladen).
export const dynamic = "force-static";

export function GET() {
  const daten = folgen.map(({ slug, titel, datum, dauer, mp3, beschreibung, shownotes }) => ({
    slug,
    titel,
    datum,
    dauer,
    mp3,
    beschreibung,
    // Klartext der Shownotes für die Volltextsuche
    text: shownotes.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim(),
  }));
  return Response.json(daten);
}
