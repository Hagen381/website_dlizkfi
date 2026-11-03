@AGENTS.md

# Projekt-Richtlinien: Podcast-Website „Das Leben ist zu kurz für irgendwann" (DLIZKFI)

## Kontext

Nachbau der bisherigen PodView-Seite https://www.daslebenistzukurzfuerirgendwann.de/
als statische Next.js-Seite (App Router, Static Export), gehostet bei
**All-Inkl** (klassisches Webhosting, kein Node.js-Server). Design, Seiten und
Adressen bleiben 1:1 wie bei PodView.

- Die Folgen selbst bleiben bei Spotify for Creators. Datenquelle ist der Feed
  https://anchor.fm/s/104754158/podcast/rss (jeden Montag eine neue Folge).
- Referenz der Live-Seite: `docs/original/` (HTML, Texte, Screenshots mobil +
  Desktop, berechnete Stile, Bilder, Sitemaps, Feed-Schnappschuss). Neu holen:
  Workflow „Referenz der Live-Seite sichern" manuell starten. PodViews
  CSS/JS-Dateien werden nicht kopiert — das Aussehen ist mit eigenem Tailwind
  nachgebaut.
- Später kommt ein Blog dazu (pro Folge ein Artikel). Die Struktur steht
  (`content/blog/`, `/blog/`, `/blog/<slug>/`), Artikel gibt es noch keine.

## Technik

- Next.js 16.4.x (unabhängig von website_molloybusiness), App Router,
  `output: "export"`, `trailingSlash: true`, Tailwind 4. Kein Server, alles
  statisch. `next-image-export-optimizer` statt Next/Image-Serveroptimierung.
- **Bilder nur über `src/components/Cover.tsx`**, nie `ExportedImage` direkt:
  Nur so bekommt jedes Bild den basePath (Vorschau) und `placeholder="empty"`
  (Blur-Bilder werden nicht erzeugt, sonst 404 auf `…-opt-10.WEBP`).
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
  `slugs` (kommagetrennt, oder `fehlende` = alle noch nicht transkribierten),
  optional `modell` (Standard `large-v3`) und `neu_erstellen`.
- faster-whisper auf CPU (int8), Sprache `de`, VAD-Filter an, `initial_prompt`
  mit Namen/Begriffen (siehe `scripts/transkribieren.py`). Ein Job pro Folge
  (Matrix, parallel), am Ende EIN gemeinsamer Commit vom Bot.
- Ergebnis: `content/transkripte/<slug>/transkript.md` (Absätze, alle 2–3 min
  eine Zeitmarke `[mm:ss]`) und `segmente.json` (Rohsegmente mit Start/Ende).
- **Transkripte bleiben wörtlich** — nichts glätten oder korrigieren. Für
  Blogartikel daraus zitieren, nicht das Transkript selbst ändern.
- **Transkripte werden nicht veröffentlicht.** Sie liegen außerhalb von
  `public/`, nichts unter `src/` importiert sie. Vorschau und Deploy brechen
  ab, wenn `transkript`, `segmente.json` oder die Markierung
  `dlizkfi-transkript` im Export auftaucht; `lftp` schließt `transkripte/`
  zusätzlich aus. MP3s werden nur im Runner geladen, nie ins Repo.

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

- Domain: www.daslebenistzukurzfuerirgendwann.de, Hoster All-Inkl.
  **Die Domain zeigt noch auf PodView.** Bis zum Live-Gang wird trotzdem in
  den Domain-Ordner hochgeladen, um das Verfahren zu testen. KAS, DNS und
  Domain-Einstellungen fasst Claude nicht an.
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
- `.htaccess` wird im Build erzeugt (`scripts/nach-dem-build.mjs`):
  http→https, ohne www → mit www (301), alte `?page=N` → `/episodes/page/N/`,
  `ErrorDocument 404`, `Options -Indexes`, Cache-Header für Bilder/Schriften.
- Sicherheitsprüfung vor dem Upload (bricht ab, nichts wird hochgeladen):
  kein `noindex` außerhalb der 404-Seiten, kein `hagen381.github.io` und kein
  `/website_dlizkfi` im Export, `index.html` und `sitemap.xml` vorhanden, alle
  alten Folgen-Adressen vorhanden, keine Transkripte im Export.

## Regeln, die nicht verhandelbar sind

- Erfinde keine Fakten, Zahlen, Adressen oder Zitate. Lieber eine sichtbare
  Lücke (z. B. „[Mailadresse folgt]", Platzhalter im Impressum).
- Zugangsdaten nur in den Secrets, nie im Code.
- Ein Commit pro abgeschlossenem Teilschritt, aussagekräftige Nachrichten.
- Mobil zuerst, Tippflächen mindestens 44 px, Kontrast mindestens 4,5:1.
  Gelb/Orange als Textfarbe auf hellem Grund deshalb nur in den dunkleren
  Varianten `text-primary-text` / `text-secondary-text`.
- Datenschutzerklärung ist ein ENTWURF (sichtbarer Hinweis oben), Impressum
  ein Gerüst mit Platzhaltern — beides vor dem Live-Gang prüfen lassen.

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
