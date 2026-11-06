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
  „Frische Folge" (Darstellung unverändert). Dazu der Header (siehe unten).

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
  `titel`, `folge-slug`, `datum`, `beschreibung`; Vorlage in
  `content/blog/README.md`). Dateiname ohne `.md` = Adresse `/blog/<slug>/`.
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
  620 px hoch (object-fit: cover). `/blog/` zeigt Karten mit dem ersten Bild.
- Button „Zur Podcastfolge" (`src/components/ZurPodcastfolge.tsx`, Stil wie
  „Abonnieren") kommt automatisch aus der Vorlage, sobald `folge-slug` gesetzt
  ist. Ziel immer `/episodes/<folge-slug>/` auf unserer Seite, nie Spotify.
  Links zur Folge im Fließtext bleiben normale Textlinks.
- „Blog" steht in der Navigation zwischen Folgen und Über, sobald mindestens
  ein veröffentlichter Artikel existiert. Die Folgenseite verlinkt den Artikel
  („Zum Blogartikel"). JSON-LD `BlogPosting` (Autorin Juliette Oppel, Bild,
  Datum, `about` → PodcastEpisode), OG-Bild = erstes Artikelbild.

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
  ruft Start, `/episodes/`, eine Folgenseite und `/follow/` (390 und 1280 px)
  mit Headless-Chromium auf, scrollt bis unten und meldet jedes Bild, jede
  Schrift und jedes CSS/JS mit Fehler. Lokal: Export unter
  `/website_dlizkfi/` ausliefern und das Skript mit dieser Basis aufrufen.

Repo: `https://github.com/Hagen381/website_dlizkfi` (öffentlich, Pflicht für
Pages), Default-Branch `main`, Pages-Quelle: GitHub Actions.

## Server (All-Inkl)

- Domain: www.daslebenistzukurzfuerirgendwann.de, Hoster All-Inkl, **live
  seit 03.11.2026** (SSL für Domain und www aktiv, Google Search Console
  eingerichtet, Sitemap eingereicht). Jeder Deploy geht direkt live. KAS, DNS
  und Domain-Einstellungen fasst Claude nicht an.
- Deploy: `.github/workflows/deploy-allinkl.yml` bei Push auf `main`, manuell
  und montags 03:30 UTC (Folgen erscheinen montags 02:00 UTC). Der
  Montagslauf holt erst den Feed, committet eine geänderte
  `content/folgen.json` und baut dann.
- Secrets: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD (eingetragen). Der FTP-Nutzer
  startet direkt im Domain-Ordner → Zielverzeichnis `./`.
- Hochgeladen wird mit `lftp` (nicht mit der FTP-Deploy-Action): All-Inkl
  verlangt, dass die Datenverbindung die TLS-Sitzung der Anmeldung
  wiederverwendet.
- Immer verschlüsselt mit Zertifikatsprüfung: `ftp:ssl-force true`,
  `ftp:ssl-protect-data true`, `ssl:verify-certificate` bleibt an. Nie
  abschalten, auch nicht zum Testen.
- Zugangsdaten nur über Umgebungsvariablen aus den Secrets
  (`lftp --env-password`). **Kein `set -x`, kein lftp-`debug`.**
- Hochladen **ohne Löschen** (`mirror -R` ohne `--delete`).
- **Einzige Ausnahme: veraltete Blogartikel.** Nach dem Upload entfernt
  `scripts/blog-aufraeumen.sh` Ordner `blog/<slug>/` und `images/blog/<slug>/`
  (inkl. optimierter WEBP-Varianten), die es im aktuellen Export nicht mehr
  gibt (zurückgezogen, umbenannt, gelöscht). Strikt nur diese zwei Ordnerarten,
  Slug `^[a-z0-9][a-z0-9-]*$`, keine Dateien direkt in `blog/`. Gibt die Pfade
  vor und nach dem Löschen aus, prüft danach per FTPS, dass sie weg sind, und
  per HTTP, dass `/blog/<slug>/` 404 liefert. Bricht ab ohne zu löschen, wenn
  der Export unvollständig ist (`index.html` oder `blog/index.html` fehlt) oder
  mehr als 10 Ordner betroffen wären. Gleiche lftp-Sicherheitsregeln wie im
  Deploy. Von Hand: Workflow „Blog auf dem Server aufraeumen"
  (`blog-aufraeumen.yml`, Standard = Testlauf, listet nur auf).
- `.htaccess` wird im Build erzeugt (`scripts/nach-dem-build.mjs`):
  http→https und ohne www → `https://www` (ein 301), alte `/sitemap-pages.xml` und
  `/sitemap-episodes.xml?…` → `/sitemap.xml`, alte `?page=N` →
  `/episodes/page/N/`, `ErrorDocument 404`, `Options -Indexes`, Cache-Header
  für Bilder/Schriften.
- Live-Kontrolle: Workflow „Live-Seite pruefen" (`live-pruefen.yml`, manuell)
  prüft www im Headless-Browser — nur lesend (Weiterleitungen http/ohne www/
  alte Sitemaps/`?page=N`, kein X-Robots-Tag, Blog, Artikel, Navigation,
  Folgenseiten-Link, Bilder).
- Sicherheitsprüfung vor dem Upload (bricht ab, nichts wird hochgeladen):
  kein `noindex` außerhalb der 404-Seiten, kein `hagen381.github.io` und kein
  `/website_dlizkfi` im Export, `index.html` und `sitemap.xml` vorhanden, alle
  alten Folgen-Adressen vorhanden, keine Transkripte, keine Platzhalter und
  kein Entwurf-Hinweis im Export, keine Bild-Metadaten (EXIF/GPS/XMP/IPTC),
  kein `X-Robots-Tag` im Export (auch nicht in der `.htaccess`).

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
