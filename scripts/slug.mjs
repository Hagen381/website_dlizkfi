// Slug-Regel wie bei PodView (aus den alten Adressen abgeleitet):
// Kleinbuchstaben, Umlaute zum Grundbuchstaben (ä→a, ö→o, ü→u — NICHT ae/oe/ue),
// ß fällt weg ("Straßenhunde" → "straenhunde", so bei PodView), Akzente weg, alles andere wird zu "-", keine doppelten/rand-"-".
//   "verändern" → "verandern"
//   "1 Jahr Podcast: 150 Hörer, 1.000 Euro" → "1-jahr-podcast-150-horer-1000-euro"
export function slugify(titel) {
  return titel
    .toLowerCase()
    .replace(/ß/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // ä → a + Trema → a
    .replace(/(\d)[.,](?=\d)/g, "$1") // 1.000 → 1000
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
