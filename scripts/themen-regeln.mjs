// Stichwortregeln für die automatische Themenvergabe neuer Folgen
// (scripts/themen-pruefen.mjs). Nur ein Vorschlag — der Projekt-Chat prüft
// die Themen danach und schickt die geprüfte Zuordnung per `uebergabe`.
//
// Jede Regel: Thema-Schlüssel aus content/themen.json → Muster. Gesucht wird
// im Titel und in den Shownotes (ohne den gleichbleibenden Schluss „Wenn dir
// der Podcast gefällt …“), klein geschrieben, ohne Akzente (ä bleibt ä).
// Ein Treffer im Titel zählt immer, in den Shownotes erst ab zwei Treffern
// (sonst bekäme fast jede Folge jedes Thema). Höchstens drei Themen, die
// stärksten zuerst; kein Treffer → „updates“.

export const REGELN = {
  vorbereiten: /auswander|vorbereit|umzug|container|haushaltsaufl|abschied|kündig|ausreise/g,
  samui: /samui/g,
  reisen: /reise|urlaub|bali|gili|lombok|vietnam|malaysia|kambodscha|laos|flug|roadtrip|ausflug/g,
  familie: /kinder|familie|geburtstag|eltern|heinrich|hermine|mama|papa/g,
  schule: /schule|homeschooling|unterricht|lernen|lehrer/g,
  visum: /visum|visa\b|einreise|immigration|bürokratie|behörde|aufenthalt/g,
  geld: /geld|finanz|steuer|business|unternehm|bitcoin|kosten|einkommen|selbstständig/g,
  kultur: /kultur|tempel|thai-|thailändisch|7-eleven|alltag|essen|songkran|loy krathong/g,
  gesundheit: /krankenhaus|hospital|arzt|krank|gesundheit|notfall|unfall|versicherung|verletz/g,
  tiere: /hund|tier|katze|skorpion|schlange|affe|gecko|natur|dschungel/g,
  mindset: /mindset|angst|mut\b|irgendwann|glück|zweifel|lebensfrage|sinn\b/g,
  interviews: /interview|zu gast|im gespräch mit|gästin|mein gast/g,
  updates: /update|rückblick|bilanz|monate in thailand|jahr in thailand/g,
};

const SCHLUSS = /wenn dir der podcast gef(ä|a)llt[\s\S]*$/i;

export function themenVorschlag(titel, shownotesHtml) {
  const klar = (s) => s.toLowerCase().replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
  const t = klar(titel);
  const n = klar(shownotesHtml).replace(SCHLUSS, "");
  const punkte = [];
  for (const [key, muster] of Object.entries(REGELN)) {
    const imTitel = (t.match(muster) || []).length;
    const imText = (n.match(muster) || []).length;
    const p = imTitel * 10 + imText;
    if (imTitel > 0 || imText >= 2) punkte.push([key, p]);
  }
  punkte.sort((a, b) => b[1] - a[1]);
  const themen = punkte.slice(0, 3).map(([k]) => k);
  return themen.length ? themen : ["updates"];
}
