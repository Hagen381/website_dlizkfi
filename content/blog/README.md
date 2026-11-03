# Blogartikel

Pro Folge ein Artikel als Markdown-Datei: `content/blog/<slug>.md`.
Der Dateiname (ohne `.md`) wird zur Adresse `/blog/<slug>/`.

```markdown
---
titel: "Überschrift des Artikels"
folge-slug: "slug-der-folge-aus-content-folgen-json"
datum: 2026-11-02
beschreibung: "Ein bis zwei Sätze — Lead unter dem Titel, Google, Vorschau."
---

Artikeltext in Markdown, Zwischenüberschriften mit `##` …

![Bildunterschrift (auch alt-Text)](bilder/<slug>/datei.jpg)
```

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
- Ist `folge-slug` gesetzt, verlinkt die Folgenseite auf den Artikel und der
  Artikel endet mit dem Kasten „Zur Folge" (inkl. Player).
