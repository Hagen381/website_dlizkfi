// Spiegelt den basePath aus next.config.ts. Nur im GitHub-Pages-Vorschaubuild
// gesetzt ("/website_dlizkfi"), im All-Inkl-Build leer.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Vorschau-Build erkennt man am gesetzten basePath. Dann: noindex auf jeder
// Seite und robots.txt mit "Disallow: /".
export const istVorschau = Boolean(basePath);

// Fuer Pfade, die NICHT ueber <Link> oder next/image laufen (z. B. <img src>,
// <audio>, fetch auf statische Dateien).
export function mitBasePath(pfad: string) {
  return `${basePath}${pfad}`;
}
