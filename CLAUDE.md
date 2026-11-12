@AGENTS.md

# Projekt-Richtlinien: Podcast-Website „Das Leben ist zu kurz für irgendwann" (DLIZKFI)

## Kontext

Statische Next.js-Seite (App Router, Static Export) für
https://www.daslebenistzukurzfuerirgendwann.de/ — **live seit 03.11.2026 auf
All-Inkl** (klassisches Webhosting, kein Node.js-Server). Nachbau der
früheren PodView-Seite: Design, Seiten und Adressen 1:1 übernommen. PodView
läuft noch bis zur Kündigung (spätestens 24.11.2026), hat aber keine Domain
mehr.

- Die Folgen selbst bleiben bei Spotify for Creators. Datenquelle ist der Feed
  https://anchor.fm/s/104754158/podcast/rss (jeden Montag eine neue Folge).
- Referenz der alten PodView-Seite: `docs/original/` (HTML, Texte,
  Screenshots mobil + Desktop, berechnete Stile, Bilder, Sitemaps,
  Feed-Schnappschuss) — **eingefroren**. Der Workflow „Referenz der Live-Seite
  sichern" ist stillgelegt (er würde jetzt die eigene Seite holen und die
  Referenz überschreiben). PodViews CSS/JS wurden nie kopiert.
- Blog unter `/blog/` (pro Folge ein Artikel), siehe Abschnitt „Blog".
- Bewusste Abweichung vom Original (ausdrücklicher Auftrag): Die Überschrift
  über der neuesten Folge auf der Startseite heißt „Neueste Folge" statt
  „Frische Folge"; die Liste darunter heißt „Weitere Folgen" statt „Neueste
  Folgen" (Darstellung jeweils unverändert). Dazu der Header und der Hero
  der Startseite mit Polaroid-Collage (siehe unten).

## Technik

- Next.js 16.4.x (unabhängig von website_molloybusiness), App Router,
  `output: "export"`, `trailingSlash: true`, Tailwind 4. Kein Server, alles
  statisch. `next-image-export-optimizer` statt Next/Image-Serveroptimierung.
- **Bilder nur über `src/components/Cover.tsx` bzw. `BlogBild.tsx`**, nie
  `ExportedImage` direkt: Nur so bekommt jedes Bild den basePath (Vorschau)
  und `placeholder="empty"` (Blur-Bilder werden nicht erzeugt, sonst 404 auf
  `…-opt-10.WEBP`).
  Kleine Logos aus `public/` laufen über `mitBasePath()` (`src/lib/base-path.ts`).
- Design-Tokens in `src/app/globals.css` (aus der Live-Seite):
  primary `#ffc814`, secondary/accent `#ff7828`, background `#FEFCE8`,
  text `#1A2E05`; Überschriften Bricolage Grotesque, Fließtext Literata.
  Nicht ohne ausdrücklichen Auftrag ändern.
- Schriften selbst gehostet unter `src/fonts/` (OFL, Lizenztexte daneben),
  eingebunden über `next/font/local`. **Kein Google Fonts, keine CDNs.**
- Bilder (Cover, Favicon, Plattform-Logos) liegen im Repo. Nichts von fremden
  Servern beim Seitenaufruf laden.
- Player: eigener HTML5-Audioplayer (`src/components/Player.tsx`) mit der MP3
  aus dem Feed, `preload="none"` — erst beim Klick auf Play wird Audio von
  Spotify/anchor geladen. Kein Spotify-Embed.
- Keine Cookies, kein Tracking. Statistik kommt aus All-Inkl (Server-Logs).
- Zentrale Angaben (Domain, Feed, Mailadresse, Plattform-Links) stehen NUR in
  `src/lib/site-config.ts`. Die Live-Domain (mit www) steht dort genau einmal.
- **„Anhören auf" = genau drei Plattformen**, in dieser Reihenfolge: Spotify,
  Apple Podcasts, YouTube (`plattformen` in `src/lib/site-config.ts`). Hero,
  Folgenseiten, Fusszeile, `/follow/`, `/about/` und JSON-LD `sameAs` lesen nur
  von dort. Andere Apps nur über den RSS-Feed auf `/follow/`. Logos liegen
  unter `public/plattformen/` (offizielle Logos, unverändert; YouTube-Icon
  aus Simple Icons, CC0, Pfad aus YouTubes Brand Resources).

### Folgen-Daten

- `npm run feed` (= `scripts/feed-holen.mjs`) lädt den Feed und schreibt
  `content/folgen.json` (Titel, Slug, Datum, Dauer, bereinigtes Shownotes-HTML,
  MP3-URL, Bild, guid). Die Datei wird committet; der Build liest nur sie.
- **Slugs sind die alten PodView-Adressen.** Die Zuordnung steht fest in
  `content/folgen.json` (Feld `slug`) und wird beim erneuten Feed-Import über
  die guid übernommen — ein bestehender Slug ändert sich nie.
- Neue Folgen bekommen einen Slug nach PodView-Regel: Kleinbuchstaben,
  Umlaute zum Grundbuchstaben (ä→a, ö→o, ü→u; ß fällt ersatzlos weg: „Straßenhunde" → `straenhunde`),
  alles andere zu `-`.
- Shownotes-Links (`scripts/shownotes-links.mjs`, läuft in `feed-holen.mjs`
  nach der Bereinigung, also automatisch für jede neue Folge): URLs als reiner
  Text werden zuerst verlinkt; Zeilen „Bezeichnung: URL" (auch fett/mit Emoji,
  Bezeichnung bis 3 Wörter) → die Bezeichnung ist der Link, Doppelpunkt und
  URL entfallen; jede übrige nackte URL als Linktext → Domain (+ Pfad, wenn
  alles ≤ 40 Zeichen) ohne `https://`/`www`; der Link auf unsere eigene Domain
  entfällt. Die Kurzbeschreibung (Karten, meta description) entsteht aus den
  aufgeräumten Shownotes. Der Feed bei Spotify bleibt unverändert. Nach einer
  Änderung daran: Deploy von Hand mit „Vorher den RSS-Feed abgleichen“
  starten (die Sandbox erreicht den Feed nicht), Guids/Slugs vergleichen.
- `content/alte-adressen.json` = alle Folgen-Adressen aus PodViews
  `sitemap-episodes.xml`. `scripts/adressen-pruefen.mjs` läuft vor jedem Build
  und bricht ab, wenn eine davon fehlt.

### Transkripte (Vorbereitung Blog)

- Workflow `.github/workflows/transkribieren.yml` (nur manuell): Eingabe
  `slugs` (kommagetrennt; Stichwörter `fehlende` und `alle`, kombinierbar),
  optional `modell` (Standard `large-v3`), `neu_erstellen` und `probelauf`
  (nichts committen, Transkript nur ins Job-Protokoll — für Modellvergleiche).
- faster-whisper auf CPU (int8), Sprache `de`, VAD-Filter an,
  `condition_on_previous_text` AUS (sonst Wiederholungsschleifen), Namen und
  Begriffe als `initial_prompt` (siehe `scripts/transkribieren.py`).
  **Keine `hotwords`**: large-v3 schrieb die Liste dann wörtlich in den Text
  und ließ echte Passagen weg. Ein Job pro Folge (Matrix, `max-parallel: 15`
  wegen GitHubs Grenze von 20 gleichzeitigen Jobs pro Konto), am Ende EIN
  gemeinsamer Commit vom Bot.
- Mögliche Schleifen (gleicher Satz ≥ 3× in 60 s) und Halluzinationen
  (abgeschriebener Prompt, Untertitel-Floskeln wie „WDR", „Untertitel",
  „www.") werden als Warnung im Lauf und in `segmente.json`
  (`meta.moegliche_schleifen`, `meta.moegliche_halluzinationen`) gemeldet,
  nicht entfernt.
- Ergebnis: `content/transkripte/<slug>/transkript.md` (Absätze, alle 2–3 min
  eine Zeitmarke `[mm:ss]`) und `segmente.json` (Rohsegmente mit Start/Ende).
- **Transkripte bleiben wörtlich** — nichts glätten oder korrigieren. Für
  Blogartikel daraus zitieren, nicht das Transkript selbst ändern.
- **Transkripte werden nicht veröffentlicht.** Sie liegen außerhalb von
  `public/`, nichts unter `src/` importiert sie. Vorschau und Deploy brechen
  ab, wenn `transkript`, `segmente.json` oder die Markierung
  `dlizkfi-transkript` im Export auftaucht; `lftp` schließt `transkripte/`
  zusätzlich aus. MP3s werden nur im Runner geladen, nie ins Repo.

### Folgenübersicht /episodes/ (3D-Register)

- Live seit 12.11.2026 (vorher Entwurf `/entwurf/folgen/`):
  `src/app/episodes/page.tsx`, `src/components/RegisterWalze.tsx`, Stile
  `src/app/episodes/register.css` (inline ohne Kommentare). Adresse,
  Canonical `/episodes/`, Titel/Description, BreadcrumbList, „Folgen“ aktiv
  in der Navigation unverändert.
- Kopf als Glasfläche: nur H1 „Alle Folgen“ und die echte Suche
  (`FolgenSuche` mit `kopfClassName`; Treffer als normale Liste mit
  `FolgenKarte` bzw. `ArtikelTrefferKarte`, siehe „Suche“). Darunter (ohne
  Hinweiszeile, seit 12.11.2026 entfernt; Abstand Kopf → Register 28 px) die
  Themenreiter (siehe „Themen“; seit 12.11.2026 statt der Monatsreiter) und
  die Walze mit ALLEN Folgen bzw. denen des gewählten Themas (rotateX 24°,
  Radius `--radius` 520 px, unter 640 px 640 px, ±3 sichtbar, außerhalb
  `visibility: hidden`). Kein Monatsschild mehr über den Karten (seit
  12.11.2026 entfernt, das Datum steht in der Karte). Fotos:
  „Foto zur Folge“ (siehe „Folgenbilder“), erst geladen, wenn die Karte in
  die Nähe kommt.
- Jede Karte hat einen echten Link auf `/episodes/<slug>/` im ausgelieferten
  HTML. Ohne JavaScript greift `src/app/episodes/register-ohne-js.css` (in
  `<noscript>`): einfache Liste aller Folgen, ohne Reiter und Steuerung.
- Bedienung (seit 12.11.2026 ruhiger, Rückmeldung Hagen): Wischen am Handy
  (eigene Touch-Handler, kein `touch-action: none` — am ersten/letzten
  Eintrag oder waagerecht scrollt die Seite) und Ziehen mit der Maus: Die
  Walze folgt gedämpft (1 Karte ≈ Kartenhöhe, max. ±1,25 Karten, Klasse
  `.zieht` ohne Übergang), beim Loslassen rastet sie ein (0,45 s,
  `prefers-reduced-motion`: ohne): unter 40 px zurück, sonst genau EINE
  Folge; nur lang (≥ 180 px) UND schnell (≥ 1 px/ms, letzte 120 ms) springt
  weiter: 180–359 px 2, ab 360 px 3 Folgen (`wischSchritte()` in
  `RegisterWalze.tsx`). Mausrad: höchstens 1 Folge pro Raststufe, danach
  250 ms Sperre; kleine Schritte (Trackpad) werden gesammelt und verlängern
  die Sperre (kein Durchrauschen), an den Enden scrollt die Seite.
  Pfeiltasten nur bei Fokus in Walze/Reitern, Knöpfe ↑ ↓, Fokus dreht die
  Karte nach vorn, Live-Ansage „Folge x von y: Titel“. Fotos der nahen
  Karten (±5) werden aktiv geladen (`loading` → eager), weil gedrehte
  hintere Karten außerhalb des Ausschnitts liegen.
- **Folgenbilder** (seit 12.11.2026): Jede Folge hat ein eigenes Foto
  `content/folgen-bilder/<slug>.jpg` (900×900, ohne Metadaten, auf Kinder,
  Kennzeichen und Bildschirme geprüft; `quellen.json` daneben = Herkunft aus
  Hagens Kamera-Ordner, wird nicht veröffentlicht). EINE Funktion
  `fotoZurFolge()` in `src/lib/folgen-foto.ts`, Reihenfolge: 1. Kartenbild
  des Blogartikels (mit `kartenbild-position`), 2. Folgenbild
  `/images/folgen/<slug>.jpg`, 3. Rückfall Collage-Foto per FNV-1a-Hash des
  Slugs. Genutzt in Walzen-Karten, Themenreitern, Liste ohne JS,
  Suchtreffern (`FolgenKarte`, Foto steht in `/suche.json`) und auf der
  Startseite („Neueste Folge“, „Weitere Folgen“). Die Folgenseiten
  `/episodes/<slug>/` behalten das Podcast-Cover. Alt-Text leer (Titel steht
  daneben), gleiche Bildgrößen wie vorher (CLS 0).
- `scripts/folgen-bilder.mjs` (vor jedem Build, live und Vorschau, nach
  `startseite-bilder.mjs`): kodiert die Bilder ohne EXIF/GPS nach
  `public/images/folgen/` (Build-Ergebnis, .gitignore), bricht ab, wenn ein
  Bild nicht 900×900 ist oder der Dateiname kein Slug aus
  `content/folgen.json` ist, entfernt verwaiste Einträge im Hash-Cache des
  Bildoptimierers. Neue Folge ohne Bild (Montagslauf): KEIN Abbruch, Karte
  zeigt das Collage-Foto, Warnung „Neue Folge ohne Folgenbild: <slug>“ im
  Build-Log und in der Zusammenfassung des Laufs (gelb, nicht rot). Bild
  nachreichen = `content/folgen-bilder/<slug>.jpg` über `uebergabe`.
- Die vordere Karte sitzt im oberen Drittel (`--mitte` 150 px, mobil 140 px,
  `perspective-origin` auf gleicher Höhe), darunter 2–3 Karten. Polaroids:
  „kopf“ neben der Kopf-Glasfläche (ab 1280 px, oben 8–12 px — tiefer
  berühren sie bei 1280 px Reiter bzw. Walze), „seite“ an der Kante des
  Registers ausgerichtet, nur ab 1360 px — nie über Reitern oder Walze.
  Mobil: Themenreiter als wischbare Leiste, Suchfeld volle Breite, „Suchen“
  darunter; Karte 236 px hoch, die Knöpfe als eigene Zeile über die ganze
  Kartenbreite (`.reg-text` dort `display: contents`). Unter 640 px: volle
  Breite, die VORDERE Karte 284 px hoch (Titel bis 5 Zeilen ganz — so lang
  ist der längste bei 360 px; Knöpfe ≥ 44 px, nicht von der nächsten Karte
  verdeckt dank Radius 640 px), Walze 600 px, Knöpfe ↑ ↓ 52 px mit 28 px
  Abstand.
- **Themen** (seit 12.11.2026): `content/themen.json` (vom Projekt-Chat,
  von Hagen freigegeben; Labels und Zuordnung wörtlich übernehmen):
  `{"themen": {key: Label, …}, "folgen": {slug: [keys] | {"themen": [keys],
  "auto": true}}}`. Reihenfolge der Themen = Reihenfolge der Reiter. Ein
  Array = geprüft, ein Objekt mit `"auto": true` = automatisch vergeben,
  noch nicht geprüft (für die Seite gleichwertig). Gelesen nur über
  `src/lib/themen.ts` (`themen`, `themenZurFolge()`).
  - `scripts/themen-pruefen.mjs` läuft vor jedem Build (live und Vorschau,
    nach `adressen-pruefen.mjs`) und im Montagslauf vor dem Commit der neuen
    Folge: Abbruch bei unbekanntem Slug, unbekanntem Thema, leerer Liste,
    falschem Format. **Neue Folge ohne Eintrag: KEIN Abbruch** — Themen per
    Stichwortregeln aus Titel/Shownotes (`scripts/themen-regeln.mjs`: Titel
    zählt immer, Shownotes ab 2 Treffern, ohne den Standard-Schluss; max. 3,
    sonst „updates“), Eintrag mit `"auto": true`, Warnung „Themen
    automatisch vergeben: <slug> → …“ gelb im Log und in der
    Zusammenfassung des Laufs (auch danach bei jedem Build, solange der
    Eintrag ungeprüft ist) — pro Lauf nur EINMAL: Im Montagslauf läuft das
    Skript vor dem Commit und im Build; eine Markierung in `RUNNER_TEMP`
    (`themen-auto-gemeldet`) verhindert die zweite Meldung (dann nur
    „(schon gemeldet)“ im Log, keine Annotation). Der Deploy committet `content/themen.json`
    zusammen mit `content/folgen.json`. Der Projekt-Chat schickt die
    geprüften Themen per `uebergabe` (dann als Array, ohne `"auto"`).
  - Themenreiter auf `/episodes/` (`RegisterWalze.tsx`, gleicher Platz und
    Stil wie früher die Monatsreiter: links 190 px, mobil eine wischbare
    Leiste): „Alle“ + jedes Thema mit Folgen, je mit Anzahl und dem Foto der
    neuesten Folge des Themas. Klick = Filter: Reiter gelb (`aria-pressed`,
    kurze Animation, nicht bei `prefers-reduced-motion`), die Walze zeigt
    nur die Folgen des Themas (neueste vorn, die anderen Karten bleiben als
    `.aus` im DOM), Live-Ansage „Thema X: n Folgen“; nochmal klicken oder
    „Alle“ = alle. `?thema=<key>` in der Adresse (teilbar, beim Laden
    ausgewertet; Canonical bleibt `/episodes/`). Ohne JS: Liste aller Folgen
    (Reiter ausgeblendet). Die Reiterleiste ist positioniert (sonst ragen
    die `sr-only`-Texte der Anzahl mobil aus der Leiste → Querscrollen);
    mobil `top: auto` (das Desktop-`top: 96px` der Sticky-Spalte würde die
    Leiste sonst unter die Walze schieben).
  - Themen-Chips (`src/components/ThemenChips.tsx`): Folgenseite (unter den
    Shownotes, nach dem Player) → `/episodes/?thema=<key>`; Blogartikel (vor
    dem Kasten „Zur Folge“, `ziel="blog"`) → `/blog/?thema=<key>` (seit
    12.11.2026). Dezent, Trefferfläche 44 px, kein 3D.
- **Suche** (seit 12.11.2026): Index `/suche.json`
  (`src/app/suche.json/route.ts`) mit Folgen (Titel, Themen-Labels,
  Shownotes) und Blogartikeln (Titel, Beschreibung, Text; live nur
  veröffentlichte, Vorschau auch Entwürfe). **Keine Transkripte.** Logik
  `src/lib/suche.ts`: Teilwörter, jedes Suchwort muss vorkommen, Synonyme
  (`SYNONYME`: Schule↔Homeschooling/Onlineschule/Unterricht, Visum↔Visa,
  Geld↔Finanzen/Steuern, Hund↔Hunde/Tiere,
  Krankenhaus↔Hospital/Gesundheit), Reihenfolge Titel > Themen > Text, bei
  Gleichstand neueste zuerst. Blogartikel als eigene Treffer mit Marke
  „Blogartikel“ (`ArtikelTrefferKarte.tsx`).
  **Ohne Layoutsprung** (seit 12.11.2026, vorher CLS bis 1,13): Ein
  Inline-Skript in `episodes/page.tsx` setzt bei `?q=` vor dem Zeichnen
  `<html data-suche>` und fordert `/suche.json` gleich an
  (`window.__sucheIndex`, `FolgenSuche` übernimmt das Promise). CSS in
  `register.css`: dann ist die Walze (`.suche-standard`, `display:
  contents`) verborgen und der gleich aufgebaute Platzhalter `.suche-vorab`
  („Suche wird geladen …“) sichtbar; der Trefferbereich (`.suche-treffer`)
  ist mindestens `100vh` hoch, die Treffer füllen nur reservierten Platz,
  „Suche zurücksetzen“ erscheint erst mit den Treffern. `FolgenSuche`
  entfernt `data-suche`, sobald die Suche läuft (und beim Verlassen).
  Bedienung unverändert.
- **Keine Blätterseiten mehr**: `/episodes/page/N/` (und `/episodes/page/`)
  sowie PodViews `/episodes/?page=N` leiten per 301 direkt auf `/episodes/`
  (ein Schritt, `.htaccess`); nicht im Export, nicht in der Sitemap. Die
  alten Ordner auf dem Server bleiben liegen (Upload ohne Löschen), die
  Regel greift vorher.

### Blog

- Artikel liegen als Markdown unter `content/blog/<slug>.md` (Frontmatter:
  `titel`, `folge-slug`, `beschreibung`; Vorlage in
  `content/blog/README.md`). Dateiname ohne `.md` = Adresse `/blog/<slug>/`.
- **Datum = Erscheinungsdatum der Folge** zu `folge-slug` aus
  `content/folgen.json` (kein `datum` im Frontmatter, wird ignoriert).
  `folge-slug` ist Pflicht; fehlt die Folge in `folgen.json`, bricht der Build
  mit Hinweis ab. `/blog/` sortiert danach (neueste Folge zuerst); dasselbe
  Datum steht auf der Karte, im Artikel („9. November 2026“, `datumLang`),
  in der Sitemap (`lastmod`) und im JSON-LD (`datePublished`).
- **Artikel und Bilder liefert Juliette bzw. Claude aus dem Chat. Den Text
  nicht ändern oder umschreiben** — nur einbauen.
- **Datei mit `_` am Anfang = Entwurf**: live unsichtbar (nicht gelesen, keine
  Bilder im Export, nicht in Navigation/Sitemap), in der Vorschau sichtbar mit
  Hinweis „Entwurf". Veröffentlichen = `_` entfernen, committen, pushen.
  Zurückziehen = `_` wieder davor, committen, pushen: Der nächste Deploy
  löscht Artikelseite und Bilder auf dem Server (siehe „Server"), die alte
  Adresse liefert dann 404. Gleiches gilt beim Umbenennen oder Löschen.
- Bilder: `content/blog/bilder/<slug>/datei.jpg`, im Text als eigener Absatz
  `![Bildunterschrift](bilder/<slug>/datei.jpg)` (Text = figcaption und alt).
  **Ohne Metadaten** liefern. `scripts/blog-bilder.mjs` kodiert sie vor dem
  Build trotzdem neu ohne EXIF/GPS nach `public/images/blog/` (Build-Ergebnis,
  nicht im Repo), fehlt ein Bild, bricht der Build ab.
  `scripts/metadaten-pruefen.mjs` prüft in Vorschau und Deploy jedes Bild im
  Export auf EXIF/XMP/IPTC.
- **Kinder (Heinrich, Hermine) nie frontal erkennbar** — und auch keine
  fremden Kinder. Silhouetten, von hinten, klein im Hintergrund sind okay.
  Vor dem Veröffentlichen jedes Bild daraufhin ansehen.
- Layout: Lesespalte ~65 Zeichen (36,5 rem), Literata 18 px, `##` in Bricolage,
  Beschreibung als Lead, darunter Button „Zur Podcastfolge", Kasten „Zur
  Folge" mit Player und demselben Button am Ende; Bilder max.
  620 px hoch (object-fit: cover). Jede Karte auf `/blog/` zeigt das
  Kartenbild: optionales Frontmatter `kartenbild: <datei>` (muss im Artikel
  vorkommen, sonst Build-Abbruch), ohne Feld das erste Bild;
  `kartenbild-position` (optional, z. B. `"50% 60%"`) setzt den Ausschnitt
  (Kachel 4:3 auf `/blog/`, quadratisch auf `/episodes/` und der Startseite).
  Das Kartenbild ist auch das OG-Bild und das Bild im JSON-LD.
- **`/blog/` = Kachel-Raster** (seit 12.11.2026, vorher 3D-Karussell —
  `BlogKarussell.tsx`, `karussell.css`, `karussell-ohne-js.css` und die
  Info-Kachel sind gelöscht): `src/app/blog/page.tsx`, Stile
  `src/app/blog/blog.css` (inline ohne Kommentare), Blättern
  `src/components/BlogBlaettern.tsx`. Kopf als Glasfläche (H1 „Blog“ +
  Text), Polaroids links/rechts (Deko, `aria-hidden`, nie über dem Raster):
  1280–1439 px nur die zwei äußeren je Seite (`.br-pola.aussen`; die inneren
  ausgeblendet und nicht geladen), Raster max. `100% − 400px`; ab 1440 px
  alle vier je Seite, Raster max. `100% − 540px`; höchstens 1040 px. So
  bleiben die Kacheln ab 1024 px ≥ 260 px breit (1280: 267, 1440: 273 px).
  **Kein Polaroid zeigt dasselbe Foto wie ein Kartenbild auf `/blog/`**:
  `POLAROIDS` in `page.tsx` (Quelle `startseite` = `content/startseite/
  bilder/`, `folgen` = `content/folgen-bilder/<slug>.jpg`, Herkunft über
  `quellen.json`); bei Dopplung (Kamera-Dateiname) bricht der Build ab.
  Neuer Artikel mit einem Polaroid-Foto als Kartenbild → Polaroid tauschen.
  - Raster: 6 Artikel pro Seite, ab 1024 px 3 Spalten (3 × 2), 640–1023 px
    2, darunter 1. Neueste Folge zuerst. Kachel (`.kipp .kipp-karte`,
    `bg-surface`, Fokus-Rahmen über `:has(a:focus-visible)`) = EIN Link auf
    `/blog/<slug>/`: Kartenbild 4:3 mit `kartenbild-position` (Bild
    `.kipp-bild`; vorderste Kachel = LCP: `BlogBildRoh wichtig` → Next-16-
    `preload` (nicht lazy, `<link rel="preload" as="image">` mit
    `imagesrcset`/`imagesizes` im `<head>`) + `fetchpriority="high"`;
    `sizes` je Stufe passend zur Kachelbreite; alle anderen lazy), Datum · Lesezeit (Wortzahl/200,
    aufgerundet), Titel (h2, Silbentrennung), Beschreibung (max. 3 Zeilen),
    unten „Weiterlesen →“. Vorschau: Entwürfe mit Marke „Entwurf“.
  - **LCP mobil** (seit 12.11.2026, vorher live 3,2 s): Die Kachel zeigt
    nicht das ganze Foto, sondern einen 4:3-Ausschnitt an
    `kartenbild-position`, den `scripts/blog-bilder.mjs` vor dem Build
    schneidet (`images/blog/<slug>/<name>.karte.jpg`, max. 1200 px, ohne
    Metadaten, Manifest-Schlüssel `karten/<slug>`, in `blog.ts` als
    `karte`) — die Kartenbilder sind oft Hochformat (747×1600), davon war
    nur ein Drittel zu sehen. `imageSizes` enthält 480 (kleinere Variante für
    schmale Bildschirme), `sizes`: < 640 px `100vw − 32px`, 640–1023 px
    `50vw − 28px`, 1024–1279 px `33.3vw − 27px`, 1280–1439 px
    `33.3vw − 160px`, ab 1440 px 273 px; der Preload trägt dieselben
    `imagesrcset`/`imagesizes`. `scripts/nach-dem-build.mjs` entfernt in
    `out/blog/index.html` die Preloads von Literata kursiv/500/600 und
    Bricolage 400 (oben nicht gebraucht, liefen parallel zum LCP-Bild);
    Warnung, wenn sie nicht gefunden werden. Startseite, `/episodes/` und
    OG-Bild nutzen weiter das ganze Kartenbild mit `kartenbild-position`.
    CSS-Inlining (`experimental.inlineCss`) getestet: kein Gewinn, minimaler
    CLS → nicht genutzt.
  - Blättern (erst ab 7 Artikeln, sonst keine Steuerung): ← „1 / 2“ → (44 px,
    `.kipp-dezent`, am Ende `disabled`). Alle Kacheln stehen im HTML
    (`data-seite` je Kachel); sichtbar ist die Seite aus `data-blog-seite`
    am `<html>` (CSS-Regeln je Seite aus `page.tsx`). Ein Inline-Skript vor
    dem Raster setzt es aus `?seite=N`, bevor gezeichnet wird (CLS 0);
    `BlogBlaettern` gleicht beim Einhängen mit der Adresse ab und entfernt
    es beim Verlassen. Klick: kurze Überblendung (nur nach Klick, nicht beim
    Laden; `prefers-reduced-motion`: ohne), Fokus auf die erste Kachel der
    neuen Seite, Live-Ansage „Seite x von y“, `?seite=N` (Seite 1 ohne
    Parameter; Canonical bleibt `/blog/`).
  - **Themenfilter** (seit 12.11.2026, Wunsch Hagen: platzsparend): Themen
    eines Artikels = Themen seiner Folge (`folge-slug` → `content/themen.json`,
    kein eigenes Frontmatter-Feld). Unter dem Kopf EINE waagerecht wischbare
    Chip-Leiste (`.br-themen`, in `BlogBlaettern.tsx`): „Alle“ + nur Themen
    mit mindestens einem Artikel, je mit Anzahl; Stil wie die mobilen
    Themenreiter auf `/episodes/` (farbige Kante oben, ohne Foto), ≥ 44 px,
    nie zweite Zeile (mittig, solange alles passt, sonst scrollbar), kein
    Querscrollen der Seite. Aktiv = gelb + `aria-pressed`; das Gelb kommt aus
    Regeln je Thema (`html[data-blog-thema=…] .br-chip[data-thema=…]`), damit
    es schon vor dem Hydrieren stimmt; kurze Hervorhebung nur nach Klick
    (`data-blog-gefiltert`, `prefers-reduced-motion`: ohne). Klick filtert
    (nochmal = alle), Seite zurück auf 1, Live-Ansage „Thema X: n Artikel“,
    `?thema=<key>` (kombinierbar mit `?seite=N`; Canonical bleibt `/blog/`).
    Blättern rechnet je Thema neu (6 pro Seite, Steuerung nur bei > 6
    Treffern, per CSS je Thema ausgeblendet).
  - Sichtbarkeit nur über zwei Attribute am `<html>`: `data-blog-thema`
    (fehlt = alle) und `data-blog-seite` (fehlt = 1). Jede Kachel trägt
    `data-seite` (Seite ohne Filter) und je Thema `data-t-<key>="N"` (Seite
    im Thema); `page.tsx` erzeugt die Regeln je Thema/Seite. Das Inline-Skript
    vor den Chips liest `?thema`/`?seite` vor dem Zeichnen (CLS 0; unbekanntes
    Thema oder zu große Seite = ignoriert). `BlogBlaettern` gleicht beim
    Einhängen ab (wichtig nach Klick auf einen Artikel-Chip — Client-
    Navigation, dort läuft das Inline-Skript nicht) und entfernt die
    Attribute beim Verlassen. Themen-Schlüssel nur `a–z0–9-` (Build-Abbruch).
  - Ohne JavaScript: `src/app/blog/blog-ohne-js.css` (in `<noscript>`): alle
    Kacheln, keine Steuerung, keine Chips.
  - `.karte-ein` (globals.css) gibt es nicht mehr.
- Button „Zur Podcastfolge" (`src/components/ZurPodcastfolge.tsx` über
  `GelberButton.tsx`, Stil wie „Abonnieren") kommt automatisch aus der Vorlage, sobald `folge-slug` gesetzt
  ist. Ziel immer `/episodes/<folge-slug>/` auf unserer Seite, nie Spotify.
  Links zur Folge im Fließtext bleiben normale Textlinks.
- „Blog" steht in der Navigation zwischen Folgen und Über, sobald mindestens
  ein veröffentlichter Artikel existiert. Die Folgenseite verlinkt den Artikel
  mit dem Button „Zum Blogartikel" direkt unter Titel/Datum, vor dem Player
  (gleicher Stil, `GelberButton.tsx`); ohne Artikel kein Button. Live nie zu
  Entwürfen (die werden live gar nicht gelesen). JSON-LD `BlogPosting` (Autorin Juliette Oppel, Bild,
  Datum, `about` → PodcastEpisode), OG-Bild = Kartenbild.

### Startseite (Hero mit Polaroid-Collage)

- Bewusste Abweichung vom PodView-Original (Entwurf freigegeben, live seit
  11.11.2026): Hero mit 25 Polaroid-Fotos um eine Glasfläche. Inhalt der
  Glasfläche wie vorher (JULIETTE, Titel, Beschreibung, „Anhören auf“ +
  3 Plattform-Kacheln, gleiche Schriften/Größen). Darunter
  `StartseiteFolgen.tsx` („Neueste Folge“, „Weitere Folgen“) — seit
  12.11.2026 mit dem Foto zur Folge statt Podcast-Cover (`fotoZurFolge()`,
  siehe „Folgenbilder“ unter Folgenübersicht): „Neueste Folge“ 420 px
  (`sizes` wie vorher), lazy, weil sie wegen der 920-px-Collage nie im
  ersten Bildschirm liegt; „Weitere Folgen“ über `FolgenKarte` (64/96 px):
  die fünf Folgen NACH der neuesten (die steht schon unter „Neueste Folge“).
- Dateien: `src/app/page.tsx` (Hero), `src/app/startseite.css` (wird beim
  Build ohne Kommentare inline eingebettet — eine Stylesheet-Anfrage weniger),
  `src/components/CollageSteuerung.tsx` (Maus-Neigung, ein Listener, rAF),
  Layout `content/startseite/collage.json` (Seite, Abstand zum Rand in %,
  oben in px, Breite, Drehung, z, `band_hinter_der_mitte`, `mobil`,
  `mobil_reihenfolge`), Fotos `content/startseite/bilder/` (900×900, ohne
  Metadaten, auf Kinder geprüft).
- `scripts/startseite-bilder.mjs` (vor jedem Build, live und Vorschau): kodiert
  die Fotos ohne EXIF/GPS nach `public/images/startseite/` (Build-Ergebnis),
  prüft collage.json (jedes Foto da, 900×900, genau 8 Mobil-Fotos mit
  Reihenfolge 1–8) und entfernt verwaiste Einträge im Hash-Cache des
  Bildoptimierers. Neue Fotos: Datei + Eintrag in collage.json.
- Größenstufen: ab 1181 px alle 25 (Band-Fotos liegen oben/unten hinter der
  Glasfläche); 1024–1180 ohne Band-Fotos; 640–1023 Seitenfotos 85 %; unter
  640 px nur die 8 Mobil-Fotos in 2 Reihen à 4 (≈ 92 px, bei schmalen Geräten
  kleiner, nichts ragt über den Rand) über der Glasfläche. Feste Hero-Höhe
  920 px ab 640 px (CLS 0).
- Glasfläche: 680 px, Radius 32 px, Hintergrund ab 640 px 90 % Deckkraft
  (80 % ergab hinter Fotos nur 3,8:1), mobil 80 % ohne Weichzeichner; Neigung
  zur Maus max. 2,5° (nicht unter 640 px), Titel/Text per translateZ davor.
- Hover pro Foto (nur `(hover: hover)`): richtet sich auf, hebt sich 12 px,
  ×1,24, Nachfedern, Neigung max. 8°, Lichtreflex, Bildzoom 1,07, wächst zur
  Seitenmitte; Band-Fotos bleiben unter dem Glas, unter 1181 px kommt kein
  Foto vor die Glasfläche. Polaroids sind Deko (`aria-hidden`, nicht
  fokussierbar). Keine Bewegung der Collage als Ganzes.
  `prefers-reduced-motion`: keine Neigung, nur Schatten und leichtes
  Hervorheben.
- Bilder über `BlogBildRoh` mit fester Breite (srcset 256/384 bzw. mobil
  128/256), lazy; ausgeblendete Varianten lädt der Browser nicht.

### Über-Seite /about/ (seit 12.11.2026)

- Vorher Entwurf `/entwurf/about/` (Freigabe Hagen); `/entwurf/about/`
  liefert live weiter 404. Dateien: `src/app/about/page.tsx`,
  `src/app/about/ueber.css` (inline ohne Kommentare),
  `src/app/about/PolaroidNeigung.tsx`. Titel „Über“, Description wie vorher
  (`siteConfig.description`), Canonical `/about/`, BreadcrumbList „Über“,
  „Über“ aktiv, in `sitePages`; kein noindex, kein Entwurf-Balken.
- Text WÖRTLICH wie die frühere `/about/` (PodView-Text,
  `docs/original/text/about.txt`; beim Livegang maschinell verglichen:
  identisch, nur die Plattformnamen stehen jetzt als `aria-label`/`title`
  der Icon-Kacheln statt als sichtbarer Text).
- Aufbau: Kopf als Glasfläche (Cover, H1 „Über …“ aus `siteConfig`,
  „Moderiert von …“); ab 1024 px je DREI Polaroids links und rechts daneben,
  leicht überlappend übereinander (Kopf 600 px, ab 1280 px 660 px — nie über
  dem Kopf); darunter vier davon als Reihe kleiner Polaroids über dem Kopf
  (die zwei `.ab-nur-breit` ausgeblendet, nicht geladen). Lesespalte in
  Glasflächen (36,5 rem, Literata 18 px, 90 %), Irgendwann-Zeilen als eigene
  Kachel (Bricolage, gelbe Kante, 94 %). Drei Fotostreifen mit je 4
  Polaroids (mobil < 640 px je 3, das 4. ausgeblendet und nicht geladen):
  zwischen Text A und Irgendwann-Kachel, zwischen B und C, zwischen C und
  „Anhören auf“ — nie hinter Text. „Anhören auf“ als Glasfläche mit den drei
  Plattform-Kacheln (`.kipp-dezent`, 56 px).
- Fotos: NUR `content/ueber/bilder/` (18 Stück, 900×900, ohne Metadaten, auf
  Kinder geprüft; aus der Übergabe vom 12.11.2026), jedes genau einmal
  (6 Kopf + 12 Streifen), keine Collage-Fotos. `scripts/ueber-bilder.mjs`
  kodiert sie vor jedem Build (live und Vorschau, vor
  `startseite-bilder.mjs`) ohne EXIF nach `public/images/ueber/`
  (Build-Ergebnis, .gitignore). Über `BlogBildRoh` (lazy, `aria-hidden`),
  Hover/Neigung wie Startseite (`PolaroidNeigung.tsx`).
- Live-Prüfung je 360/390/820/1280/1440 px: Fotos geladen, nichts über den
  Rand, kein Querscrollen, H1, „Über“ aktiv, kein noindex, Canonical,
  Kontrast des Texts ≥ 4,5:1 (gemessen 5,46:1).

### Seitenhintergrund (alle Seiten)

- Die drei weichen Farbflecken (primary/secondary, statisch) liegen als EINE
  fixe Ebene hinter allem Inhalt: `src/components/SeitenHintergrund.tsx` im
  Layout, Stile `.seiten-hintergrund`/`.seiten-fleck-*` in `globals.css`
  (`position: fixed`, `z-index: -1`, `pointer-events: none`, Höhe `100lvh`).
  Nicht pro Seite kopieren; auch die Startseite nutzt diese Ebene. Mobil
  (< 640 px) weiche radial-gradients statt `filter: blur` (Leistung).
- Lesbarkeit: Text ohne deckenden Untergrund muss gegen die ungünstigste
  Fleckfarbe ≥ 4,5:1 haben (die Ebene ist fix, Text scrollt darüber).
  `text-muted` erreicht dort nur ~4,1:1 → dahinter `.glas-flaeche`
  (`globals.css`: 90 % Seitengrund, Radius 28 px; Blogartikel, Kopf von
  `/blog/`, 404-Seite) oder ein kleiner Untergrund `bg-bg/90` („Neueste
  Folge“). Karten mit `bg-surface` (Folgenseite, Rechtstexte,
  Folgen-/Blog-Karten) brauchen nichts. Neue Seiten mit gedämpftem Text
  direkt auf dem Hintergrund entsprechend unterlegen.

### Header

- Bewusste Abweichung vom PodView-Original (ausdrücklicher Auftrag):
  Cover 44 px mit Schriftzug „DLIZKFI" (ab 640 px zusätzlich „Das Leben ist zu
  kurz für irgendwann"), Menüpunkte als Flächen (Bricolage semibold 16 px,
  min. 44 px hoch), aktive Seite gelb mit `aria-current="page"` (auch auf
  Unterseiten), „Abonnieren" als gelber Button mit Kopfhörer-Icon.
- Klebt oben (`position: sticky`), halbtransparent mit backdrop-blur, Linie
  unten erst nach dem Scrollen; `scroll-padding-top` in `globals.css`.
- Unter 1024 px „☰ Menü"-Knopf; das Menü wird per Portal in `<body>`
  gerendert (sonst wäre der Header wegen `backdrop-filter` der Bezugsrahmen
  für `position: fixed`). Fokus bleibt im Menü, Escape/außerhalb schließt.
- Die Marke oben links (Cover + „DLIZKFI“, ab 640 px mit Untertitel) ist
  ebenfalls eine dezente Kachel (`.kipp .kipp-dezent`, gleicher Grund/Rand/
  Radius wie die Menüpunkte), Link auf die Startseite, dort gelb mit
  `aria-current="page"` (Untertitel dann `text-text`, `text-muted` hätte auf
  Gelb nur ~3,7:1). Genau 44 px hoch (`h-11` inkl. Rand), das 44-px-Cover
  liegt bündig links über dem Rand (`-my-px -ml-px`) — so bleibt die
  Header-Höhe gleich (CLS 0). „☰ Menü“ hat `whitespace-nowrap`.
- Menüpunkte in `navigation`, der Button in `abonnieren` (`site-config.ts`).
- Marke, Menüpunkte (Desktop und Mobil-Menü), „Abonnieren“ und „☰ Menü“/„Schließen“
  sind dezente Kacheln (`.kipp .kipp-dezent`): leichter Grund (surface), feiner
  Rand, abgerundet. Aktive Seite gelb; bei „Abonnieren“ markiert eine `outline`
  die aktive Seite (kein `ring` — das wäre box-shadow und würde vom
  Kachel-Schatten ersetzt). Der Hover-Schatten bleibt innerhalb des
  Header-Innenabstands (12 px) — beim Ändern von `--kipp-schatten-hoch` der
  Stufe „dezent“ darauf achten.

### 3D-Kippeffekt (Karten, Buttons, Menü)

- CSS in `globals.css` (`.kipp` + Stufe), JS nur `src/components/KippSteuerung.tsx`
  (ein Listener für die ganze Seite, im Layout eingebunden; setzt
  `--kipp-x/--kipp-y` zur Mausposition, nur Maus, per rAF). Keine Bibliothek.
- Stufen: `.kipp-karte` (hebt 6 px, Neigung max. 3,5°, großer weicher
  Schatten, Fokus mit 3-px-Rahmen um die Karte über `:has(a:focus-visible)`)
  und `.kipp-dezent` (hebt 2,5 px, max. 2°, kleiner Schatten, normaler
  Fokusrahmen). Obergrenze steht als `--kipp-max` in der Stufe. Elemente
  breiter/höher als 400 px kippen anteilig weniger.
- Fokus (Tab) = gleiche Hebung und Schatten wie Hover. Hover nur bei
  `(hover: hover)`, Touch ohne Hover-Zwang. `prefers-reduced-motion`: keine
  Neigung, kein Anheben, kein Einblenden — nur der Schatten.
- Nur transform/box-shadow/Farben, kein CLS. `.kipp::before` ist eine
  unsichtbare Trefferfläche bis zur Ruhelage (sonst zittert ein angehobenes
  Element am unteren Rand) — deshalb kein `overflow-hidden` auf `.kipp`
  selbst (bei Bedarf auf ein inneres Element).
- `.kipp` steht außerhalb von `@layer` und setzt sich gegen Tailwind durch:
  auf `.kipp`-Elementen keine `shadow-*`, `ring-*`, `translate-*` oder
  `transition`-Klassen verwenden.
- Wo: `.kipp-karte` = Folgen-Karten (Start, Suchtreffer auf `/episodes/`),
  Artikel-Kacheln auf `/blog/`.
  Die Register-Karten auf `/episodes/` haben kein `.kipp` (die Walze dreht). Die
  Kacheln auf `/blog/` sind `.kipp-karte`.
  `.kipp-dezent` = Header (s. o.), `GelberButton.tsx`, „Jetzt anhören“,
  Plattform-Links (Hero, Folgenseite, `/about/`, `/follow/`, Fusszeile),
  Blätter-Pfeile auf `/blog/`,
  RSS-Feed, Teilen, „Alle Folgen ansehen“/„Alle ansehen“,
  „Zurück zu allen Folgen“/„Alle Artikel“, Suche zurücksetzen, 404-Buttons.
- **Kein 3D** für Textlinks im Fließtext (Artikel, Shownotes, Impressum,
  Datenschutz, Mailadresse) und für Player/Play-Knöpfe.

## Übergabe vom Projekt-Chat

- Dateien vom Projekt-Chat (Blogbilder, Artikel-Markdown) kommen **nur** über
  den GitHub-Zweig `uebergabe` (Orphan-Branch, eigene README.md dort lesen) —
  nicht mehr über D:\ oder den Chat.
- Pfade dort = Zielpfade auf `main`. Übernehmen:
  `git fetch origin uebergabe && git checkout origin/uebergabe -- <pfad>`
- **Nie** von `uebergabe` nach `main` mergen.
- Bilder dort sind verkleinert, ohne Metadaten und auf Kinder geprüft —
  trotzdem vor dem Einbau selbst ansehen (Kinder nie frontal erkennbar) und
  auf Metadaten prüfen.
- Nach dem Einbau auf `main` die übernommenen Dateien in `uebergabe` wieder
  löschen (eigener Commit auf `uebergabe`, README bleibt). Der Zweig wird
  sauber gehalten, keine Ablage.
- `uebergabe` wird nicht gebaut: Deploy und Vorschau reagieren nur auf Pushes
  nach `main` (`branches: [main]`), alle anderen Workflows nur manuell; der
  Zweig enthält außerdem kein `.github/`. Neue Workflows mit Push-Auslöser
  immer auf `main` beschränken.

## SEO-Grundregeln

- **Jede Seite setzt ihr eigenes Canonical** (`alternates: { canonical:
  "/pfad/" }`). Das Layout setzt keins.
- **Jede feste Seite gehört in `sitePages`** in `src/lib/site-config.ts`.
  Folgen und Blogartikel ergänzt `src/app/sitemap.ts` selbst (Blätterseiten
  gibt es seit 12.11.2026 nicht mehr).
- `trailingSlash: true` ist Pflicht (alle URLs enden auf `/`).
- JSON-LD: PodcastSeries (Layout), PodcastEpisode (Folgenseiten),
  BreadcrumbList (jede Unterseite, unsichtbar — kein sichtbarer
  Brotkrumenpfad, wie im Original). `<link rel="alternate">` auf den RSS-Feed.
- `/blog/` erscheint erst in Navigation und Sitemap, wenn es Artikel gibt.

## Vorschau-Kanal: GitHub Pages

**https://hagen381.github.io/website_dlizkfi/** — nur zur internen Kontrolle.
Jeder Push auf `main` baut per `.github/workflows/gh-pages.yml` neu
(basePath über `NEXT_BUILD_BASE_PATH`). Der Vorschau-Build setzt auf jeder
Seite `noindex` und eine robots.txt mit `Disallow: /`; der Workflow prüft das
und bricht sonst ab. Die Vorschau darf nie in Google landen.

Weitere Prüfungen im Vorschau-Workflow (Lauf wird sonst rot):
- `scripts/vorschau-pfade-pruefen.mjs`: Jede `src`/`srcset`/`url(...)` im
  Export (HTML, CSS, RSC-.txt), die mit `/` beginnt, muss mit
  `/website_dlizkfi/` anfangen.
- Job `bilder-pruefen` nach dem Deploy: `scripts/vorschau-bilder-pruefen.mjs`
  ruft Start, `/episodes/`, eine Folgenseite, `/follow/`, `/blog/` und
  `/about/` (390 und 1280 px) mit Headless-Chromium auf, scrollt
  bis unten und meldet jedes Bild, jede Schrift und jedes CSS/JS mit Fehler
  (ausgeblendete lazy-Bilder werden direkt angefragt). Vorübergehende Fehler
  (5xx, 429, Verbindungsabbruch — GitHub Pages direkt nach dem Deploy) werden
  bis zu 3× mit Pause 2/4/6 s neu angefragt und erst dann rot; im Protokoll
  als „(vorübergehend) … nach n× Wiederholung“. Echte 404/4xx sofort rot.
  Wenn `/blog/` dabei ist, zusätzlich das Blog-Raster mit Entwürfen: alle
  Artikel als Link im HTML, Reihenfolge/Datum, Marke „Entwurf“ genau bei
  Entwürfen, bei 360/390/820/1280/1440 px Spalten, alles im Bild, kein
  Querscrollen, Polaroids nicht über dem Raster, Kartenbilder geladen,
  Blättern (→, `?seite=2`, Fokus, „2 / n“) und `?seite=2` direkt,
  Themen-Chips in einer Zeile (≥ 44 px) und `?thema=<größtes Thema>&seite=2`
  direkt (nur das Thema, Chip aktiv, CLS 0). Lokal: Export unter
  `/website_dlizkfi/` ausliefern und das Skript mit dieser Basis aufrufen.

### Entwürfe nur in der Vorschau

- Entwurfsseiten liegen unter `src/entwuerfe/` (außerhalb von `src/app`, also
  ohne Route). `scripts/entwuerfe.mjs` (vor jedem Build) legt NUR im
  Vorschau-Build `src/app/entwurf/<name>/page.tsx` als Re-Export an
  (und bereitet ggf. Bilder vor); im Live-Build löscht es die Route. `src/app/entwurf/` ist
  Build-Ergebnis (.gitignore). Neuer Entwurf = Seite unter
  `src/entwuerfe/<name>/Seite.tsx` + Eintrag in `entwuerfe` im Skript.
- Nicht über `pageExtensions` (`page.vorschau.tsx`): Next findet dann die
  Schrift-Preloads nicht. Nicht über `generateStaticParams` mit leerer Liste:
  beim Static Export ein Build-Fehler.
- Entwürfe: `noindex`, eigenes Canonical, nicht in `sitePages`/Navigation,
  oben Balken „Entwurf – nicht live“.
- Deploy-Prüfung k) bricht ab, wenn `entwurf/` oder `startseite-entwurf` im
  Live-Export steht; `scripts/live-pruefen.mjs` erwartet live 404 für
  `/entwurf/startseite/` und `/entwurf/`.
- **Derzeit keine Entwürfe** (`entwuerfe = {}` in `scripts/entwuerfe.mjs`,
  `src/entwuerfe/` gibt es nicht mehr). Früher: `/entwurf/about/` ist seit
  12.11.2026 die echte `/about/` (siehe „Über-Seite“).
- Live-Prüfung erwartet 404 für `/entwurf/`, `/entwurf/about/`,
  `/entwurf/folgen/`, `/entwurf/blog/`, `/entwurf/startseite/`.
- Früher: `/entwurf/folgen/` ist seit 12.11.2026 die echte Folgenübersicht
  `/episodes/` (siehe „Folgenübersicht“).
- Früher: `/entwurf/blog/` ist seit 12.11.2026 die echte Blogübersicht
  `/blog/` (siehe „Blog“), `src/entwuerfe/blog/` und der Eintrag in
  `scripts/entwuerfe.mjs` sind entfernt; live liefert `/entwurf/blog/` 404.
  (`/entwurf/startseite/` ist seit 11.11.2026 die echte Startseite.)
  Eigene Bilder eines Entwurfs nur im Vorschau-Zweig von
  `scripts/entwuerfe.mjs` vorbereiten; Pfade nie mit „startseite-entwurf“
  (Deploy-Prüfung k).

Repo: `https://github.com/Hagen381/website_dlizkfi` (öffentlich, Pflicht für
Pages), Default-Branch `main`, Pages-Quelle: GitHub Actions.

## Server (All-Inkl)

- Domain: www.daslebenistzukurzfuerirgendwann.de, Hoster All-Inkl, **live
  seit 03.11.2026** (SSL für Domain und www aktiv, Google Search Console
  eingerichtet, Sitemap eingereicht). Jeder Deploy geht direkt live. KAS, DNS
  und Domain-Einstellungen fasst Claude nicht an.
- Deploy: `.github/workflows/deploy-allinkl.yml` bei Push auf `main` (Push-
  Auslöser nur `main`), manuell und per Zeitplan für die neue Folge. Die Folge
  ist meist gegen 06:00 UTC (13:00 Thailand) im Feed; GitHub startet
  Zeitpläne oft verspätet. Zeitplan: **Mo 06:30 UTC** (Hauptlauf),
  **Mo 11:30 UTC** und **Di 02:30 UTC** (Nachläufe).
  - Zeitplan-Läufe holen zuerst den Feed. Nur wenn sich `content/folgen.json`
    geändert hat: committen, pushen, Vorschau anstoßen, bauen, prüfen,
    hochladen, Blog aufräumen und danach automatisch
    `scripts/live-pruefen.mjs --nur-neueste` (neueste Folge live erreichbar,
    Titel stimmt). Sonst endet der Lauf grün mit „Keine neue Folge“ in der
    Zusammenfassung — kein Build, kein Upload.
  - Dienstagslauf: Steht noch keine Folge mit Montagsdatum (oder später) im
    Feed, endet er mit der Warnung „Keine neue Folge seit Montag“ (gelb im
    Actions-Überblick, nicht rot).
  - Manuell gestartete Läufe bauen wie bisher immer (Feed-Abgleich wählbar).
    Mit `wie_zeitplan` verhält sich ein manueller Lauf wie ein Zeitplan-Lauf
    (zum Testen des „nur bei neuer Folge“-Pfads).
- Secrets: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD (eingetragen). Der FTP-Nutzer
  startet direkt im Domain-Ordner → Zielverzeichnis `./`.
- Hochgeladen wird mit `lftp` (nicht mit der FTP-Deploy-Action): All-Inkl
  verlangt, dass die Datenverbindung die TLS-Sitzung der Anmeldung
  wiederverwendet.
- **Werkzeuge ohne apt** (seit der Runner-Störung am 11.11.2026, als die
  Ubuntu-Paketserver im Runner nicht auflösbar waren):
  `scripts/lftp-installieren.sh` holt lftp erst als Ubuntu-.deb aus dem
  Actions-Cache (`actions/cache/restore`, Schlüssel `lftp-deb-…-noble-v1`),
  sonst per apt (danach sofort `actions/cache/save`), sonst von conda-forge
  über micromamba (Version + SHA-256 fest, lftp 4.9.3 mit OpenSSL; nur dann
  `ssl:ca-file` auf den System-CA-Bestand in `~/.lftprc`). Die
  Sicherheitseinstellungen stehen unverändert in den lftp-Befehlen.
  Zeitplan-Läufe holen das Paket immer ab (hält den Cache über die
  7-Tage-Frist), ohne neue Folge ohne roten Lauf bei Fehlern.
  `scripts/playwright-installieren.sh` nutzt das vorinstallierte Google
  Chrome (`PW_KANAL=chrome` → `chromium.launch({ channel: "chrome" })` in
  `live-pruefen.mjs`/`vorschau-bilder-pruefen.mjs`), `--with-deps` nur als
  Rückfall. Lokal ohne `PW_KANAL` Playwrights Chromium.
- Immer verschlüsselt mit Zertifikatsprüfung: `ftp:ssl-force true`,
  `ftp:ssl-protect-data true`, `ssl:verify-certificate` bleibt an. Nie
  abschalten, auch nicht zum Testen.
- Zugangsdaten nur über Umgebungsvariablen aus den Secrets
  (`lftp --env-password`). **Kein `set -x`, kein lftp-`debug`.**
- Hochladen **ohne Löschen** (`mirror -R` ohne `--delete`).
- **Ausnahme 1: veraltete Blogartikel und Blogbilder.** Nach dem Upload
  entfernt `scripts/blog-aufraeumen.sh`, was es im aktuellen Export nicht mehr
  gibt — strikt nur:
  1. Ordner `blog/<slug>/` und `images/blog/<slug>/` (zurückgezogen,
     umbenannt, gelöscht; inkl. optimierter WEBP-Varianten),
  2. einzelne Dateien in `images/blog/<slug>/` bzw.
     `images/blog/<slug>/nextImageExportOptimizer/` noch bestehender Artikel
     (ausgetauschte Bilder samt WEBP-Varianten).
  Slug `^[a-z0-9][a-z0-9-]*$`, Dateiname `^[A-Za-z0-9][A-Za-z0-9._-]*$` (nie
  Punkt-Dateien wie `.htaccess`, andere Namen/Unterordner nur als Warnung),
  keine Dateien direkt in `blog/` oder `images/blog/`. Gibt die Pfade vor und
  nach dem Löschen aus, prüft danach per FTPS, dass sie weg sind, und per HTTP,
  dass Gelöschtes 404 liefert und alle Bilddateien der betroffenen Artikel
  weiter 200. Bricht ab ohne zu löschen, wenn der Export unvollständig ist
  (`index.html` oder `blog/index.html` fehlt) oder mehr als 10 Ordner bzw. 50
  Dateien betroffen wären. Gleiche lftp-Sicherheitsregeln wie im
  Deploy. Von Hand: Workflow „Blog auf dem Server aufraeumen"
  (`blog-aufraeumen.yml`, Standard = Testlauf, listet nur auf).
- **Ausnahme 2: „Server aufräumen“** (ausdrücklicher Auftrag von Hagen,
  12.11.2026). Workflow `server-aufraeumen.yml`, **nur manuell**, Eingabe
  `modus`: `testlauf` (Standard, listet nur auf) | `loeschen`. **Gelöscht
  wird nur per manuellem Lauf nach Freigabe im Chat**, nie automatisch im
  Deploy. Skript `scripts/server-aufraeumen.sh` (FTPS/HTTP, Löschen) +
  `scripts/server-aufraeumen-liste.mjs` (Vergleich, löscht nichts).
  - Vorgehen: frischen Live-Export bauen, Dateiliste vom Server per FTPS
    (`find -l`, Wurzelordner eine Ebene + die Bereiche), mit dem Export
    vergleichen. Kandidaten = Server-Dateien/-Ordner, die es im Export nicht
    gibt, NUR in `_next/`, `images/`, `episodes/`, `blog/`, `entwurf/` und
    alte Einzeldateien direkt im Wurzelordner, die eindeutig Build-Ergebnis
    sind (`*.html`, RSC-`*.txt`, `*.xml`, `*.json`, `*.webp`, `*.jpg`,
    `*.png`, `*.ico`, `*.svg`, `*.woff2`). Alles andere nur als Warnung.
    Ordner werden nur entfernt, wenn darunter nichts bleibt (`rmdir`, kein
    `rm -r`).
  - **Nie gelöscht:** Punkt-Dateien/-Ordner (`.htaccess`, `.htpasswd`,
    `.well-known` …) samt allem darunter, alles, was im aktuellen Export
    existiert (z. B. die 18 Über-Fotos `images/ueber/`), Ordner außerhalb
    der Bereiche (z. B. Logs/Statistik von All-Inkl, sie werden gar nicht
    durchsucht), Namen außerhalb `^[A-Za-z0-9][A-Za-z0-9._-]*$` (ausgenommen
    nur der Bereich `_next` selbst und Nexts Manifeste
    `_next/static/<build-id>/_buildManifest.js`, `_ssgManifest.js`,
    `_clientMiddlewareManifest.js`, Build-IDs mit „_“/„-“ am Anfang genau an
    ihrer Stelle `_next/<id>` bzw. `_next/static/<id>` sowie RSC-Dateien
    `__next.….txt` unter `episodes/`, `blog/`, `entwurf/` — z. B.
    `episodes/page/N/__next.episodes.page.$d$seite.__PAGE__.txt`; Pfade
    gehen deshalb in Anführungszeichen an lftp, `"`/`\`/Steuerzeichen nie), Bestätigungsdateien von Suchmaschinen
    (`google….html`, `BingSiteAuth.xml`, `yandex_….html`), Dateien der alten
    WordPress-Installation im Wurzelordner (`readme.html`, `license.txt`,
    `index.php`, `wp-*`, `xmlrpc.php` — nur Warnung), die Build-ID der
    Live-Seite (`_next/static/<id>/`, `_next/<id>/` — sie ist bei jedem
    Build neu, deshalb aus der Live-Startseite gelesen; auch ihre leeren
    Ordner) und jede Datei, auf
    die die Kontrollseiten live verweisen.
  - `_next/static/`: Dateien, die der Export nicht kennt, erst löschen, wenn
    sie älter als 7 Tage sind (Besucher mit alter Seite im Cache).
  - Ausgabe (Protokoll + Zusammenfassung des Laufs): Tabelle je Bereich
    (Dateien, MB, leere Ordner), Gesamt, `_next/static/` unter 7 Tagen,
    Warnungen, vollständige Liste und eine **Prüfsumme der Liste**.
  - Sicherheitsgrenzen: Abbruch ohne Löschen, wenn der Export unvollständig
    ist (`index.html`, `episodes/index.html`, `blog/index.html`,
    `sitemap.xml`), mehr als 3000 Dateien betroffen wären, eine
    Kontrollseite nicht 200 liefert, die Build-ID der Live-Seite fehlt oder
    die Live-Seite auf Dateien verweist, die nicht im Export stehen (Server
    nicht auf dem Stand des Exports).
  - Löschmodus: braucht die Eingabe `pruefsumme` aus dem freigegebenen
    Testlauf; nur wenn die neu berechnete Liste genau dieselbe ist, wird
    gelöscht (sonst neuer Testlauf). Dateien einzeln (`rm -f`), dann leere
    Ordner (`rmdir`, tiefste zuerst). Danach per FTPS prüfen, dass alles weg
    ist und keine Export-Datei fehlt, per HTTP, dass Startseite,
    `/episodes/`, `/blog/`, `/about/`, die neueste Folgenseite, ein Artikel
    und alle ihre Dateien (JS, CSS, Schriften, Bilder) weiter 200 liefern;
    danach die volle Live-Prüfung (`live-pruefen.mjs`).
  - Gleiche lftp-Sicherheitsregeln wie im Deploy (`ftp:ssl-force`,
    `ftp:ssl-protect-data`, Zertifikatsprüfung an, `--env-password`, kein
    `set -x`/`debug`); `concurrency` wie der Deploy (nie gleichzeitig).
- **Ausnahme 3: alte WordPress-Installation entfernen** (einmalig,
  ausdrücklicher Auftrag von Hagen, 12.11.2026; die WordPress-Datenbank im
  KAS löscht Hagen selbst — nicht anfassen). Gleicher Workflow
  `server-aufraeumen.yml`, `modus`: `wordpress-testlauf` (listet nur auf:
  Anzahl, MB, Prüfsumme) | `wordpress` (nur mit `pruefsumme` aus dem
  Testlauf). Liste `scripts/server-aufraeumen-wordpress.mjs`, **feste
  Pfadliste statt Vergleich**: Ordner `wp-admin/`, `wp-content/`,
  `wp-includes/`, `pinterest-media/` (mit Inhalt), Dateien im Wurzelordner
  `wp-*.php`, `xmlrpc.php`, `index.php`, `readme.html`, `license.txt`,
  `index.htm`. Die 3000er-Grenze gilt hier nicht.
  - Nie: Punkt-Dateien/-Ordner (`.htaccess`, `.htpasswd`, `.well-known` …,
    auch innerhalb der WordPress-Ordner — der Ordner darüber bleibt dann
    stehen), nichts, was im aktuellen Export steht oder worauf die Live-Seite
    verweist. Abbruch ohne Löschen, wenn etwas außerhalb der Liste betroffen
    wäre oder ein Pfad `"`, `\` oder Steuerzeichen enthält.
  - Danach: FTPS-Kontrolle (alles weg, keine Export-Datei fehlt),
    Kontrollseiten + ihre Dateien 200, `/wp-login.php`, `/wp-admin/`,
    `/xmlrpc.php`, `/readme.html`, `/index.htm`, `/license.txt`,
    `/index.php`, `/wp-content/`, `/wp-includes/`, `/pinterest-media/`
    liefern 404/403, dann die volle Live-Prüfung.
  - **Erledigt am 12.11.2026** (Prüfsumme `828e45ccd35ccfff`): 27.200
    Dateien (855 MB) und 3.590 Ordner gelöscht, FTPS-Kontrolle ok, alle 10
    WordPress-Adressen 404 (`/wp-content/` 403, weil dort Punkt-Dateien
    liegen), Live-Prüfung grün. Stehen geblieben sind nur 33 Punkt-Dateien
    (z. B. `.htaccess` in Backup-/Cache-Ordnern von `wp-content/`) samt
    ihren Ordnern — bei Bedarf löscht Hagen sie im KAS-Dateimanager.
    Hinweis: Listen dieser Größe passen nicht in die Zusammenfassung des
    Laufs (GitHub-Grenze 1 MB, Fehlermeldung im Protokoll ohne Folgen), die
    vollständige Liste steht im Protokoll. Der Lauf dauerte ~3,5 h.
- `.htaccess` wird im Build erzeugt (`scripts/nach-dem-build.mjs`):
  http→https und ohne www → `https://www` (ein 301), alte `/sitemap-pages.xml` und
  `/sitemap-episodes.xml?…` → `/sitemap.xml`, `/episodes/page/N/`,
  `/episodes/page/` und alte `/episodes/?page=N` → `/episodes/` (je ein 301,
  keine Kette), `ErrorDocument 404`, `Options -Indexes`, Cache-Header
  für Bilder/Schriften.
- Live-Kontrolle: Workflow „Live-Seite pruefen" (`live-pruefen.yml`, manuell)
  prüft www im Headless-Browser — nur lesend (Weiterleitungen http/ohne www/
  alte Sitemaps/`?page=N`/`/episodes/page/2/` → `/episodes/`, kein
  X-Robots-Tag, Polaroid-Collage der
  Startseite bei 360/390/820/1280/1440 px (Anzahl sichtbar, Fotos geladen,
  nichts über den Rand), Themenreiter bei 390/1280 px (Anzahl, „Alle“
  aktiv, Reiter nicht über der Walze, Klick auf „Visum & Bürokratie“ filtert
  + `?thema=visum`, nochmal klicken = alle, `/episodes/?thema=visum` lädt
  gefiltert, Fotos geladen), Suche „Schule“ (Homeschooling/Onlineschule
  dabei, Titeltreffer zuerst; `?q=Bali`/`?q=Schule` bei
  360/390/820/1280/1440 px mit CLS 0, Walze verborgen), Themen-Chips auf einer Folgenseite, Walze
  per Touch bei 390 px (kurzer Wisch +1, zu kurz 0, zurück −1, lang+schnell
  ≤ +3, eingerastet; vordere Karte volle Breite, Titel ganz, Knöpfe ≥ 44 px
  frei, ↑ ↓ ≥ 48 px, keine Monatsschilder) und Mausrad bei 1280 px (+1 pro
  Stufe, Trackpad-Schwung ≤ +1), `/about/` je Breite (Fotos, Rand,
  Querscrollen, Kontrast ≥ 4,5:1, kein noindex, Canonical),
  Folgen-Register (alle Folgen als Link im HTML; bei
  360/390/820/1280/1440 px Walze sichtbar, vordere Karte im Bild, Fotos
  geladen — Bilder außerhalb eines waagerecht scrollbaren Ausschnitts wie der
  mobilen Reiterleiste zählen nicht —, nichts über den Rand, H1), Blog-Raster (alle Artikel als Link im HTML, LCP-Preload mit Kartenausschnitt 480w und ohne die vier unnötigen Schrift-Preloads,
  Reihenfolge/Datum, Kartenbilder; bei 360/390/820/1280/1440 px Spalten
  1/1/2/3/3, Seite 1 mit bis zu 6 Kacheln, alles im Bild, Polaroids nicht
  über dem Raster, kein Querscrollen; ab 7 Artikeln Blättern bei 390/1280 px
  und `?seite=2` direkt, sonst keine Steuerung; Themen-Chips bei allen
  fünf Breiten: „Alle“ + Themen mit Artikeln samt Anzahl, eine Zeile,
  ≥ 44 px, kein Querscrollen, CLS 0; bei 390/1280 px Klick auf das größte
  Thema filtert + `?thema=…` + Ansage, nochmal = alle, `?thema=…&seite=2`
  und `?seite=2` direkt mit CLS 0; Artikel-Chips → `/blog/?thema=…`), Artikel, Navigation, Folgenseiten-Link,
  Bilder, 404 für `/entwurf/`, `/entwurf/about/`, `/entwurf/folgen/`,
  `/entwurf/blog/`, `/entwurf/startseite/`). Läuft auch mit `--nur-neueste` nach einem
  Deploy mit neuer Folge.
- Lighthouse live: Workflow „Lighthouse live" (`lighthouse-live.yml`,
  manuell, Eingabe `pfade`) — Median aus 3 Läufen mobil und Desktop, Tabelle
  im Protokoll und in der Zusammenfassung des Laufs.
- Sicherheitsprüfung vor dem Upload (bricht ab, nichts wird hochgeladen):
  kein `noindex` außerhalb der 404-Seiten, kein `hagen381.github.io` und kein
  `/website_dlizkfi` im Export, `index.html` und `sitemap.xml` vorhanden, alle
  alten Folgen-Adressen vorhanden, keine Transkripte, keine Platzhalter und
  kein Entwurf-Hinweis im Export, keine Bild-Metadaten (EXIF/GPS/XMP/IPTC),
  kein `X-Robots-Tag` im Export (auch nicht in der `.htaccess`), keine
  Entwürfe (`entwurf/`, `startseite-entwurf`).

## Regeln, die nicht verhandelbar sind

- Erfinde keine Fakten, Zahlen, Adressen oder Zitate. Lieber eine sichtbare
  Lücke (z. B. Platzhalter in eckigen Klammern).
- Zugangsdaten nur in den Secrets, nie im Code.
- Ein Commit pro abgeschlossenem Teilschritt, aussagekräftige Nachrichten.
- Mobil zuerst, Tippflächen mindestens 44 px, Kontrast mindestens 4,5:1.
  Gelb/Orange als Textfarbe auf hellem Grund deshalb nur in den dunkleren
  Varianten `text-primary-text` / `text-secondary-text`.
- Datenschutzerklärung ist FINAL (Stand November 2026, kein Entwurf mehr).
  Abschnitt 3 beschreibt die KAS-Einstellung der Logfiles (IP sofort
  vollständig anonymisiert, Löschung nach 7 Tagen, Statistik passwort-
  geschützt) — ändert sich dort etwas, den Text anpassen.
- Impressum ist ausgefüllt (Juliette Oppel, Anschrift in Thailand). Einziger
  Kontaktweg ist die Mailadresse, kein Telefon.
- Platzhalter (`Platzhalter.tsx`, `EntwurfHinweis.tsx`, fehlende Mailadresse)
  tragen `data-platzhalter`; die Live-Sicherheitsprüfung bricht ab, wenn das
  oder „Entwurf – wird geprüft" im Export steht.
- Name, Anschrift und Mailadresse stehen NUR in `src/lib/site-config.ts`
  (`verantwortlich`, `kontaktEmail`); Impressum, Datenschutz und Kontakt lesen
  von dort (`Anschrift.tsx`, `Mailadresse.tsx`). Die Mailadresse liegt dort in
  zwei Teilen und wird erst im Browser zum mailto:-Link zusammengesetzt — so
  steht sie in keiner exportierten Datei am Stück. Nicht als Klartext-String
  in Seiten schreiben.

## Automatische Abschluss-Zusammenfassung

Am Ende JEDER Aufgabe (egal wie klein) IMMER eine Zusammenfassung in genau
diesem Format ausgeben, ohne dass der Nutzer danach fragen muss:

```
- Erledigt: [was konkret gebaut/geändert wurde, stichpunktartig]
- Geänderte/neue Dateien bzw. Routen: [Liste]
- Abweichungen vom Original oder von der Anweisung (falls es welche gab) und warum
- Offene Punkte / was noch fehlt für diesen Abschnitt
- Vorschau-Link: [GitHub-Pages-URL, ggf. mit Hinweis auf betroffene Unterseite]
```

Regeln dazu:
- Die Zusammenfassung ersetzt keine sonstige Kommunikation, sie steht
  zusätzlich am Ende.
- „Abweichungen" nur auflisten, wenn es welche gab — sonst kurz „keine".
- Der Vorschau-Link ist https://hagen381.github.io/website_dlizkfi/ (plus
  Unterseite), nicht die Live-Domain.
- Vor der Zusammenfassung sicherstellen, dass der Stand committet und gepusht
  ist und der Pages-Lauf grün ist.
