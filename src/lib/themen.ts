import daten from "../../content/themen.json";

// Themen der Folgen (content/themen.json, vom Projekt-Chat gepflegt; Prüfung
// und automatische Vergabe für neue Folgen: scripts/themen-pruefen.mjs).
// Eintrag je Folge: ["key", …] (geprüft) oder { themen: [...], auto: true }
// (automatisch vergeben, noch nicht geprüft) — für die Seite gleichwertig.
// Genutzt von: Themenreiter auf /episodes/, Suchindex /suche.json,
// Themen-Chips auf Folgenseiten und Blogartikeln.

export type Thema = { key: string; label: string };

type Eintrag = string[] | { themen: string[]; auto?: boolean };

const labels = daten.themen as Record<string, string>;
const zuordnung = daten.folgen as Record<string, Eintrag>;

// Reihenfolge wie in themen.json
export const themen: Thema[] = Object.entries(labels).map(([key, label]) => ({ key, label }));

export function themenZurFolge(slug: string): Thema[] {
  const e = zuordnung[slug];
  const liste = !e ? [] : Array.isArray(e) ? e : e.themen;
  return liste.filter((k) => k in labels).map((key) => ({ key, label: labels[key] }));
}
