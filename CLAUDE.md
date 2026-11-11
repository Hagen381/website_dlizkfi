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
  620 px hoch (object-fit: cover). `/blog/` zeigt Karten mit dem Kartenbild:
  optionales Frontmatter `kartenbild: <datei>` (muss im Artikel vorkommen,
  sonst Build-Abbruch), ohne Feld das erste Bild; `kartenbild-position`
  (optional, z. B. `"50% 60%"`) setzt den Ausschnitt. Das Kartenbild ist auch
  das OG-Bild und das Bild im JSON-LD.
- Blog-Karten: 3D-Hover `.kipp .kipp-karte` (siehe „3D-Kippeffekt“), dazu
  kurzer Bildzoom (`.kipp-bild`) und beim Laden gestaffelt einblenden
  (`.karte-ein` auf dem `<li>`, nicht auf der Karte — sonst überschreiben sich
  die Transforms). Ganze Karte ist der Link.
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
  3 Plattform-Kacheln, gleiche Schriften/Größen). Darunter unverändert
  `StartseiteFolgen.tsx` („Neueste Folge“, „Weitere Folgen“).
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
  `/blog/`, 404-Seite) oder ein kleiner Untergrund `bg-bg/90` („Seite x von
  y“, „Neueste Folge“). Karten mit `bg-surface` (Folgenseite, Rechtstexte,
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
- Menüpunkte in `navigation`, der Button in `abonnieren` (`site-config.ts`).
- Menüpunkte (Desktop und Mobil-Menü), „Abonnieren“ und „☰ Menü“/„Schließen“
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
  selbst (bei Bedarf auf ein inneres Element, siehe `BlogKarte.tsx`).
- `.kipp` steht außerhalb von `@layer` und setzt sich gegen Tailwind durch:
  auf `.kipp`-Elementen keine `shadow-*`, `ring-*`, `translate-*` oder
  `transition`-Klassen verwenden.
- Wo: `.kipp-karte` = Blog-Karten, Folgen-Karten (Start, `/episodes/`, Suche).
  `.kipp-dezent` = Header (s. o.), `GelberButton.tsx`, „Jetzt anhören“,
  Plattform-Links (Hero, Folgenseite, `/about/`, `/follow/`, Fusszeile),
  RSS-Feed, Teilen, Blättern, „Alle Folgen ansehen“/„Alle ansehen“,
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
  Folgen, Blätterseiten und Blogartikel ergänzt `src/app/sitemap.ts` selbst.
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
  ruft Start, `/episodes/`, eine Folgenseite, `/follow/` und aktuelle
  Entwürfe (`/entwurf/folgen/`, `/entwurf/blog/`) (390 und 1280 px) mit Headless-Chromium auf, scrollt
  bis unten und meldet jedes Bild, jede Schrift und jedes CSS/JS mit Fehler
  (ausgeblendete lazy-Bilder werden direkt angefragt). Lokal: Export unter
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
- Aktuell: `/entwurf/folgen/` — Folgenübersicht als 3D-Register
  (`src/entwuerfe/folgen/`: `Seite.tsx`, `RegisterWalze.tsx`,
  `register.css` inline). Kopf als Glasfläche mit der echten Suche
  (`FolgenSuche` mit `kopfClassName`), Monatsreiter, Walze mit allen Folgen
  (rotateX 24°, Radius 520 px, ±3 sichtbar), Fotos: Kartenbild des
  Blogartikels, sonst Collage-Foto per FNV-1a-Hash des Slugs. Jede Karte hat
  einen echten Link auf `/episodes/<slug>/`. Live-Prüfung erwartet 404.
  Bedienung: Mausrad (an den Enden scrollt die Seite), Ziehen mit Maus,
  Wischen am Handy (eigene Touch-Handler, kein `touch-action: none` — am
  ersten/letzten Eintrag oder waagerecht scrollt die Seite), Pfeiltasten nur
  bei Fokus in Walze/Reitern, Karten außerhalb ±3 `visibility: hidden`,
  Fokus dreht die Karte nach vorn, Live-Ansage „Folge x von y: Titel“.
- Aktuell außerdem: `/entwurf/blog/` — Blogübersicht als 3D-Karussell
  (`src/entwuerfe/blog/`: `Seite.tsx`, `BlogKarussell.tsx`, `karussell.css`
  inline). Kopf als Glasfläche (H1 „Blog“ + Text von `/blog/`), nur
  veröffentlichte Artikel in der Reihenfolge von `/blog/`, Hochformat-Karten
  (300×420, mobil 230×320) auf einem Ring (Radius per CSS `tan()` aus
  Kartenbreite und Anzahl, kein JS-Messen → CLS 0), Kartenbild mit
  `kartenbild-position`, Schild (94 %, nur das Foto hinterer Karten wird
  abgedunkelt — sonst < 4,5:1), Glasfläche zum vorderen Artikel mit Datum ·
  Lesezeit (Wortzahl/200, aufgerundet), „Weiterlesen“, „Zur Podcastfolge“;
  ← Punkte → (Punkte als Buttons, 44 px). Ziehen/Wischen waagerecht
  (`touch-action: pan-y`), Klick hinten holt nach vorn, Klick vorn öffnet,
  nur Tastatur-Fokus dreht (`:focus-visible`), Pfeiltasten nur lokal,
  Live-Ansage, 1–2 Artikel ohne Ring. Live-Prüfung erwartet 404.
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
- **Einzige Ausnahme: veraltete Blogartikel und Blogbilder.** Nach dem Upload
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
- `.htaccess` wird im Build erzeugt (`scripts/nach-dem-build.mjs`):
  http→https und ohne www → `https://www` (ein 301), alte `/sitemap-pages.xml` und
  `/sitemap-episodes.xml?…` → `/sitemap.xml`, alte `?page=N` →
  `/episodes/page/N/`, `ErrorDocument 404`, `Options -Indexes`, Cache-Header
  für Bilder/Schriften.
- Live-Kontrolle: Workflow „Live-Seite pruefen" (`live-pruefen.yml`, manuell)
  prüft www im Headless-Browser — nur lesend (Weiterleitungen http/ohne www/
  alte Sitemaps/`?page=N`, kein X-Robots-Tag, Polaroid-Collage der
  Startseite bei 360/390/820/1280/1440 px (Anzahl sichtbar, Fotos geladen,
  nichts über den Rand), Blog, Artikel, Navigation, Folgenseiten-Link,
  Bilder, 404 für `/entwurf/`, `/entwurf/folgen/`, `/entwurf/blog/`). Läuft auch mit `--nur-neueste` nach einem
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
