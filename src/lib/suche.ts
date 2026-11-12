// Suchlogik für /episodes/ (src/components/FolgenSuche.tsx, Index /suche.json).
// - Teilwörter: „schul“ findet „Schule“, „Homeschooling“ findet „homeschool“.
// - Jedes Suchwort muss vorkommen (in Titel, Themen-Label oder Text).
// - Einfache Synonyme: Ein Suchwort aus einer Gruppe findet auch die anderen
//   Wörter der Gruppe (in beide Richtungen).
// - Reihenfolge: Treffer im Titel zuerst, dann im Themen-Label, dann im Text;
//   bei Gleichstand neueste zuerst.

export const SYNONYME: string[][] = [
  ["schule", "homeschooling", "onlineschule", "unterricht"],
  ["visum", "visa"],
  ["geld", "finanzen", "steuern"],
  ["hund", "hunde", "tiere"],
  ["krankenhaus", "hospital", "gesundheit"],
];

export const normal = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

const GRUPPEN = SYNONYME.map((g) => g.map(normal));

// Alle Varianten eines Suchworts: das Wort selbst plus die Gruppe, wenn das
// Wort ein Gruppenwort ist oder (ab 4 Buchstaben) ein Gruppenwort beginnt
// bzw. mit einem beginnt („hunden“ → hund, „schul“ → schule).
export function varianten(wort: string) {
  const v = new Set([wort]);
  for (const g of GRUPPEN) {
    if (g.some((s) => s === wort || (wort.length >= 4 && (s.startsWith(wort) || wort.startsWith(s))))) g.forEach((s) => v.add(s));
  }
  return [...v];
}

export type Suchbar = { titel: string; themen: string[]; text: string; datum: string };

export function suchen<T extends Suchbar>(index: T[], begriff: string): T[] {
  const woerter = normal(begriff).split(/\s+/).filter(Boolean).map(varianten);
  if (!woerter.length) return [];
  const bewertet: [T, number][] = [];
  for (const e of index) {
    const titel = normal(e.titel);
    const themen = normal(e.themen.join(" "));
    const text = normal(e.text);
    let punkte = 0;
    let alle = true;
    for (const v of woerter) {
      const p = v.some((w) => titel.includes(w)) ? 100 : v.some((w) => themen.includes(w)) ? 10 : v.some((w) => text.includes(w)) ? 1 : 0;
      if (!p) {
        alle = false;
        break;
      }
      punkte += p;
    }
    if (alle) bewertet.push([e, punkte]);
  }
  return bewertet.sort((a, b) => b[1] - a[1] || b[0].datum.localeCompare(a[0].datum)).map(([e]) => e);
}
