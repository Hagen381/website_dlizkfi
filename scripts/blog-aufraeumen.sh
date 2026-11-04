#!/usr/bin/env bash
# Entfernt auf dem All-Inkl-Server Blogartikel, die es im aktuellen Export
# nicht mehr gibt (zurückgezogen = wieder Entwurf, umbenannt, gelöscht).
# Der normale Deploy lädt ohne --delete hoch; ohne diesen Schritt bliebe so
# ein Artikel unter seiner alten Adresse erreichbar.
#
# STRIKT begrenzt auf genau zwei Arten von Ordnern:
#   blog/<slug>/          (Artikelseite)
#   images/blog/<slug>/   (Artikelbilder inkl. optimierter WEBP-Varianten)
# <slug> muss ^[a-z0-9][a-z0-9-]*$ sein. Nichts anderes wird angefasst, auch
# keine Dateien direkt in blog/ (die überschreibt der Upload ohnehin).
#
# Umgebung:
#   FTP_SERVER, FTP_USERNAME, LFTP_PASSWORD   aus den Secrets (nie ausgeben)
#   EXPORT     Export-Ordner (Standard: out)
#   TESTLAUF   1 = nur auflisten, nichts löschen (Standard: 1)
#   LIVE_URL   z. B. https://www.daslebenistzukurzfuerirgendwann.de — danach
#              prüfen, dass gelöschte Artikel 404 liefern (optional)
#   MAX_LOESCHEN  Obergrenze pro Lauf (Standard: 10) — Schutz vor Fehlern
#
# Wie im Deploy: verschlüsselt, Zertifikat geprüft, Passwort nur über
# --env-password, kein set -x, kein lftp-debug.

set -euo pipefail

EXPORT="${EXPORT:-out}"
TESTLAUF="${TESTLAUF:-1}"
MAX_LOESCHEN="${MAX_LOESCHEN:-10}"
SLUG='^[a-z0-9][a-z0-9-]*$'

# Schutz: Ohne vollständigen Export (Build gescheitert o. ä.) wird nie gelöscht.
if [ ! -f "$EXPORT/index.html" ] || [ ! -f "$EXPORT/blog/index.html" ]; then
  echo "::error::Export unvollständig ($EXPORT/index.html oder $EXPORT/blog/index.html fehlt) — es wird nichts gelöscht."
  exit 1
fi

lftp_basis() {
  cat <<EOF
set cmd:fail-exit true
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ftp:passive-mode true
set net:timeout 20
set net:max-retries 2
${LFTP_OEFFNEN_TEST:-open --env-password -u "$FTP_USERNAME" "ftp://$FTP_SERVER"}
EOF
}
# LFTP_OEFFNEN_TEST: nur für lokale Tests gegen einen Ordner (open file://…).
# Im Workflow nie gesetzt.

# Ordnernamen (nur Slugs) in einem Server-Verzeichnis auflisten; fehlt das
# Verzeichnis, ist die Liste leer.
server_ordner() {
  local dir="$1"
  { lftp_basis; echo "set cmd:fail-exit false"; echo "cls -1 --classify $dir/"; echo "bye"; } | lftp 2>/dev/null \
    | sed -e 's#\r$##' -e "s#^$dir/##" | grep '/$' | sed 's#/$##' | grep -E "$SLUG" || true
}

export_ordner() {
  local dir="$1"
  [ -d "$EXPORT/$dir" ] || return 0
  find "$EXPORT/$dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E "$SLUG" || true
}

zu_loeschen=()
for bereich in blog images/blog; do
  server="$(server_ordner "$bereich" | sort -u)"
  lokal="$(export_ordner "$bereich" | sort -u)"
  echo "Server $bereich/: $(echo "$server" | grep -c . || true) Ordner | Export: $(echo "$lokal" | grep -c . || true) Ordner"
  while IFS= read -r s; do
    [ -n "$s" ] || continue
    if ! grep -qxF "$s" <<<"$lokal"; then zu_loeschen+=("$bereich/$s/"); fi
  done <<<"$server"
done

if [ "${#zu_loeschen[@]}" -eq 0 ]; then
  echo "Keine veralteten Blogartikel auf dem Server."
  exit 0
fi

echo "Veraltete Blog-Ordner auf dem Server (gibt es im Export nicht mehr):"
printf '  %s\n' "${zu_loeschen[@]}"

if [ "${#zu_loeschen[@]}" -gt "$MAX_LOESCHEN" ]; then
  echo "::error::${#zu_loeschen[@]} Ordner wären zu löschen (Obergrenze $MAX_LOESCHEN) — abgebrochen, bitte prüfen."
  exit 1
fi

if [ "$TESTLAUF" = "1" ]; then
  echo "TESTLAUF: nichts gelöscht."
  exit 0
fi

{
  lftp_basis
  for p in "${zu_loeschen[@]}"; do echo "rm -r -f $p"; done
  echo "bye"
} | lftp
echo "Gelöscht:"
printf '  %s\n' "${zu_loeschen[@]}"

# Kontrolle 1: auf dem Server wirklich weg?
fehler=0
for bereich in blog images/blog; do
  noch="$(server_ordner "$bereich")"
  for p in "${zu_loeschen[@]}"; do
    case "$p" in "$bereich"/*)
      s="${p#"$bereich"/}"; s="${s%/}"
      if grep -qxF "$s" <<<"$noch"; then echo "::error::$p liegt noch auf dem Server."; fehler=1; fi ;;
    esac
  done
done

# Kontrolle 2: Artikeladresse liefert 404
if [ -n "${LIVE_URL:-}" ]; then
  for p in "${zu_loeschen[@]}"; do
    case "$p" in blog/*)
      url="${LIVE_URL%/}/$p"
      code="$(curl -sS -o /dev/null -m 20 -w '%{http_code}' "$url" || echo "keine Antwort")"
      echo "$url -> $code"
      if [ "$code" != "404" ]; then echo "::error::$url liefert $code statt 404."; fehler=1; fi ;;
    esac
  done
fi
exit $fehler
