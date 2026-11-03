# Blogartikel

Pro Folge ein Artikel als Markdown-Datei: `content/blog/<slug>.md`.
Der Dateiname (ohne `.md`) wird zur Adresse `/blog/<slug>/`.

```markdown
---
titel: "Überschrift des Artikels"
folge-slug: "slug-der-folge-aus-content-folgen-json"
datum: 2026-11-02
beschreibung: "Ein bis zwei Sätze für Google und die Vorschau."
---

Artikeltext in Markdown …
```

- Solange hier kein Artikel liegt, erscheint `/blog/` weder in der Navigation
  noch in der Sitemap.
- Ist `folge-slug` gesetzt, verlinkt die Folgenseite auf den Artikel und der
  Artikel auf die Folge.
- Dateien, die mit `_` beginnen, werden ignoriert (Entwürfe).
