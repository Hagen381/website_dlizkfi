// Läuft vor "next build" (und vor "next dev").
//
// Entwürfe nur in der Vorschau (z. B. /entwurf/<name>/). Die Seiten liegen
// unter src/entwuerfe/ — außerhalb von src/app, also ohne Route.
//
// Vorschau-Build (NEXT_BUILD_BASE_PATH gesetzt): src/app/entwurf/<name>/page.tsx
// wird angelegt (nur ein Re-Export der Seite aus src/entwuerfe/) → Route
// existiert. Live-Build: src/app/entwurf/ wird gelöscht → keine Route, live 404.
// src/app/entwurf/ ist Build-Ergebnis (.gitignore).
//
// Neuer Entwurf: Seite unter src/entwuerfe/<name>/Seite.tsx anlegen (mit
// metadata inkl. noindex und Canonical) und hier in `entwuerfe` eintragen.
// Braucht er eigene Bilder, diese hier nur im Vorschau-Zweig vorbereiten;
// Pfade dürfen nie „startseite-entwurf“ enthalten (Deploy-Prüfung k).
//
// Warum nicht pageExtensions ("page.vorschau.tsx")? Next sucht die
// Schrift-Preloads über den Dateinamen ohne letzte Endung ("page.vorschau")
// und findet sie dann nicht. Und generateStaticParams mit leerer Liste lässt
// Next beim Static Export nicht zu.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routenOrdner = path.join(wurzel, "src/app/entwurf");

// Name der Route → Modul unter src/entwuerfe/
// { folgen: "folgen/Seite" } → /entwurf/folgen/ (Folgenübersicht als 3D-Register)
// (/entwurf/blog/ ist seit 12.11.2026 die echte Blogübersicht /blog/.)
const entwuerfe = { folgen: "folgen/Seite" };

fs.rmSync(routenOrdner, { recursive: true, force: true });

if (!process.env.NEXT_BUILD_BASE_PATH) {
  console.log("Entwürfe: Live-Build — keine Entwurfsseiten.");
  process.exit(0);
}

for (const [name, modul] of Object.entries(entwuerfe)) {
  const ordner = path.join(routenOrdner, name);
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(
    path.join(ordner, "page.tsx"),
    `// Erzeugt von scripts/entwuerfe.mjs — nur im Vorschau-Build, nicht bearbeiten.\nexport { default, metadata } from "@/entwuerfe/${modul}";\n`,
  );
}
const namen = Object.keys(entwuerfe);
console.log(`Entwürfe (nur Vorschau): ${namen.length ? namen.map((n) => `/entwurf/${n}/`).join(", ") : "keine"}.`);
