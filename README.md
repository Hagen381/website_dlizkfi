# Übergabe-Zweig (nicht `main`)

Hier legt der Projekt-Chat (Claude) fertige Dateien für den Coder ab:
Blogbilder, Artikel-Markdown. Der Zweig wird **nicht gebaut und geht nicht live**.

Regeln:
- Dateien liegen unter demselben Pfad, den sie auf `main` bekommen sollen
  (z. B. `content/blog/bilder/<slug>/datei.jpg`). Übernehmen auf `main`:
  `git fetch origin uebergabe && git checkout origin/uebergabe -- <pfad>`
- Bilder hier sind schon verkleinert, ohne Metadaten und auf Kinder geprüft.
- **Sauber halten:** Nur das, was gerade übergeben wird. Nach dem Einbau auf
  `main` entfernt der Coder die übernommenen Dateien hier wieder (eigener
  Commit auf `uebergabe`). Im Normalfall liegt hier nur diese README.
- Nie von `uebergabe` nach `main` mergen.
