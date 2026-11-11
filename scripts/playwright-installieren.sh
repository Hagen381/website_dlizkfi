#!/usr/bin/env bash
# Playwright für die Prüfskripte (vorschau-bilder-pruefen.mjs,
# live-pruefen.mjs) im GitHub-Runner bereitstellen — ohne apt.
#
# Installiert nur das npm-Paket playwright nach $RUNNER_TEMP/werkzeug und
# nutzt das auf ubuntu-latest vorinstallierte Google Chrome (PW_KANAL=chrome
# → chromium.launch({ channel: "chrome" }) in den Skripten). Kein
# --with-deps, also kein apt. Nur wenn kein Chrome da ist: Playwrights
# Chromium mit --with-deps (apt, bei gestörtem Spiegel einmal mit
# archive.ubuntu.com).
set -euo pipefail

ziel="${RUNNER_TEMP:-/tmp}/werkzeug"
mkdir -p "$ziel"
cd "$ziel"
npm init -y >/dev/null
npm install --silent playwright@1.49.1

if command -v google-chrome >/dev/null 2>&1; then
  echo "Nutze vorinstalliertes $(google-chrome --version)"
  [ -n "${GITHUB_ENV:-}" ] && echo "PW_KANAL=chrome" >> "$GITHUB_ENV"
  exit 0
fi

echo "Kein Google Chrome gefunden - installiere Playwright-Chromium (apt)."
if ! npx playwright install --with-deps chromium >/dev/null; then
  echo "apt: Paketspiegel gestört - versuche archive.ubuntu.com."
  echo "http://archive.ubuntu.com/ubuntu/" | sudo tee /etc/apt/apt-mirrors.txt >/dev/null
  npx playwright install --with-deps chromium >/dev/null
fi
