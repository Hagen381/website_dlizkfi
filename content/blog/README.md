# Blogartikel

Pro Folge ein Artikel als Markdown-Datei: `content/blog/<slug>.md`.
Der Dateiname (ohne `.md`) wird zur Adresse `/blog/<slug>/`.

```markdown
---
titel: "Überschrift des Artikels"
folge-slug: "slug-der-folge-aus-content-folgen-json"
beschreibung: "Ein bis zwei Sätze — Lead unter dem Titel, Google, Vorschau."
kartenbild: "datei.jpg"            # optional, sonst das erste Bild
kartenbild-position: "50% 50%"     # optional, Ausschnitt auf der Karte
---

Artikeltext in Markdown, Zwischenüberschriften mit `##` …

![Bildunterschrift (auch alt-Text)](bilder/<slug>/datei.jpg)
```

- **Datum:** Kein `datum` im Frontmatter. Das Datum des Artikels ist das
  Erscheinungsdatum der Folge zu `folge-slug` (aus `content/folgen.json`);
  danach sortiert `/blog/` (neueste Folge zuerst), es steht auf der Karte, im
  Artikel, in der Sitemap und im JSON-LD. `folge-slug` ist deshalb Pflicht —
  steht die Folge noch nicht in `content/folgen.json`, bricht der Build ab.
- **Kartenbild:** `kartenbild` (optional) = Dateiname eines Bildes aus
  `bilder/<slug>/`, das im Artikel vorkommt. Es ist das Bild der Karte auf
  `/blog/` und das OG-Bild (Vorschau beim Teilen). Ohne Feld: erstes Bild.
  `kartenbild-position` (optional, z. B. `"50% 60%"`) verschiebt den
  Ausschnitt auf der Karte (4:3), damit das Motiv sichtbar ist.
- **Entwurf:** Dateiname mit `_` am Anfang (`_<slug>.md`). Live unsichtbar,
  in der Vorschau (GitHub Pages) sichtbar mit Hinweis „Entwurf".
  Veröffentlichen = `_` entfernen.
- **Bilder** unter `content/blog/bilder/<slug>/`, jeweils als eigener Absatz.
  Ohne Metadaten liefern (sie werden beim Build ohnehin neu kodiert und
  geprüft). Fehlt ein Bild, bricht der Build ab.
- **Kinder nie frontal erkennbar** (Heinrich, Hermine und fremde Kinder).
- Text aus dem Chat **nicht umschreiben**.
- Solange kein veröffentlichter Artikel existiert, erscheint `/blog/` weder
  in der Navigation noch in der Sitemap.
- Über `folge-slug` verlinkt die Folgenseite auf den Artikel und der
  Artikel endet mit dem Kasten „Zur Folge" (inkl. Player).
