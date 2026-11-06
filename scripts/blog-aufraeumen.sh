#!/usr/bin/env bash
# Entfernt auf dem All-Inkl-Server Blog-Reste, die es im aktuellen Export
# nicht mehr gibt. Der normale Deploy lädt ohne --delete hoch; ohne diesen
# Schritt blieben sie unter ihrer alten Adresse erreichbar.
#
# STRIKT begrenzt auf genau drei Dinge:
#   1. Ordner blog/<slug>/          (Artikelseite eines zurückgezogenen,
#                                    umbenannten oder gelöschten Artikels)
#   2. Ordner images/blog/<slug>/   (Bilder dieses Artikels inkl. WEBP)
#   3. Einzelne Dateien in images/blog/<slug>/ bzw.
#      images/blog/<slug>/nextImageExportOptimizer/ eines NOCH BESTEHENDEN
#      Artikels, die im Export fehlen (ausgetauschte Bilder samt Varianten).
# <slug> muss ^[a-z0-9][a-z0-9-]*$ sein, Dateinamen ^[A-Za-z0-9][A-Za-z0-9._-]*$
# (nie Punkt-Dateien wie .htaccess). Nichts anderes wird angefasst, auch keine
# Dateien direkt in blog/ oder images/blog/.
#
# Umgebung:
#   FTP_SERVER, FTP_USERNAME, LFTP_PASSWORD   aus den Secrets (nie ausgeben)
#   EXPORT       Export-Ordner (Standard: out)
#   TESTLAUF     1 = nur auflisten, nichts löschen (Standard: 1)
#   LIVE_URL     z. B. https://www.daslebenistzukurzfuerirgendwann.de — danach
#                prüfen, dass Gelöschtes 404 liefert und die eingebundenen
#                Bilder der betroffenen Artikel weiter 200 (optional)
#   MAX_LOESCHEN Obergrenze Ordner pro Lauf (Standard: 10) — Schutz vor Fehlern
#   MAX_DATEIEN  Obergrenze einzelne Dateien pro Lauf (Standard: 50)
#
# Wie im Deploy: verschlüsselt, Zertifikat geprüft, Passwort nur über
# --env-password, kein set -x, kein lftp-debug.

set -euo pipefail

EXPORT="${EXPORT:-out}"
TESTLAUF="${TESTLAUF:-1}"
MAX_LOESCHEN="${MAX_LOESCHEN:-10}"
MAX_DATEIEN="${MAX_DATEIEN:-50}"
SLUG='^[a-z0-9][a-z0-9-]*$'
DATEI='^([A-Za-z0-9][A-Za-z0-9._-]*/)?[A-Za-z0-9][A-Za-z0-9._-]*$'

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

# Alle Dateien (rekursiv, relativ) in images/blog/<slug>/ auf dem Server.
# Ordnerzeilen (enden auf /) fallen weg.
server_dateien() {
  local dir="images/blog/$1"
  { lftp_basis; echo "set cmd:fail-exit false"; echo "find $dir/"; echo "bye"; } | lftp 2>/dev/null \
    | sed -e 's#\r$##' | grep "^$dir/" | sed "s#^$dir/##" | grep -v '/$' | grep -v '^$' || true
}

export_dateien() {
  local dir="$EXPORT/images/blog/$1"
  [ -d "$dir" ] || return 0
  find "$dir" -type f -printf '%P\n'
}

# --- 1./2. Ganze Artikel-Ordner ------------------------------------------------
zu_loeschen=()
declare -A lokal_ordner
for bereich in blog images/blog; do
  server="$(server_ordner "$bereich" | sort -u)"
  lokal="$(export_ordner "$bereich" | sort -u)"
  lokal_ordner[$bereich]="$lokal"
  echo "Server $bereich/: $(echo "$server" | grep -c . || true) Ordner | Export: $(echo "$lokal" | grep -c . || true) Ordner"
  while IFS= read -r s; do
    [ -n "$s" ] || continue
    if ! grep -qxF "$s" <<<"$lokal"; then zu_loeschen+=("$bereich/$s/"); fi
  done <<<"$server"
done

# --- 3. Einzelne verwaiste Bilddateien in bestehenden Artikel-Ordnern ----------
dateien_loeschen=()
betroffen=()
server_bilder="$(server_ordner images/blog | sort -u)"
while IFS= read -r s; do
  [ -n "$s" ] || continue
  grep -qxF "$s" <<<"${lokal_ordner[images/blog]}" || continue   # ganzer Ordner, siehe oben
  lokal="$(export_dateien "$s" | sort -u)"
  [ -n "$lokal" ] || continue                                     # leerer Export-Ordner: nichts tun
  server="$(server_dateien "$s" | sort -u)"
  treffer=0
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    grep -qxF "$d" <<<"$lokal" && continue
    if ! grep -qE "$DATEI" <<<"$d"; then
      echo "::warning::Ungewöhnlicher Dateiname, wird NICHT gelöscht: images/blog/$s/$d"
      continue
    fi
    case "$d" in */*) [ "${d%%/*}" = "nextImageExportOptimizer" ] || { echo "::warning::Unbekannter Unterordner, wird NICHT gelöscht: images/blog/$s/$d"; continue; } ;; esac
    dateien_loeschen+=("images/blog/$s/$d")
    treffer=1
  done <<<"$server"
  if [ "$treffer" = 1 ]; then betroffen+=("$s"); fi
done <<<"$server_bilder"

if [ "${#zu_loeschen[@]}" -eq 0 ] && [ "${#dateien_loeschen[@]}" -eq 0 ]; then
  echo "Keine veralteten Blogartikel oder Blogbilder auf dem Server."
  exit 0
fi

if [ "${#zu_loeschen[@]}" -gt 0 ]; then
  echo "Veraltete Blog-Ordner auf dem Server (gibt es im Export nicht mehr):"
  printf '  %s\n' "${zu_loeschen[@]}"
fi
if [ "${#dateien_loeschen[@]}" -gt 0 ]; then
  echo "Verwaiste Bilddateien in bestehenden Artikeln (gibt es im Export nicht mehr):"
  printf '  %s\n' "${dateien_loeschen[@]}"
fi

if [ "${#zu_loeschen[@]}" -gt "$MAX_LOESCHEN" ]; then
  echo "::error::${#zu_loeschen[@]} Ordner wären zu löschen (Obergrenze $MAX_LOESCHEN) — abgebrochen, bitte prüfen."
  exit 1
fi
if [ "${#dateien_loeschen[@]}" -gt "$MAX_DATEIEN" ]; then
  echo "::error::${#dateien_loeschen[@]} Dateien wären zu löschen (Obergrenze $MAX_DATEIEN) — abgebrochen, bitte prüfen."
  exit 1
fi

if [ "$TESTLAUF" = "1" ]; then
  echo "TESTLAUF: nichts gelöscht."
  exit 0
fi

{
  lftp_basis
  for p in "${zu_loeschen[@]}"; do echo "rm -r -f $p"; done
  for p in "${dateien_loeschen[@]}"; do echo "rm -f $p"; done
  echo "bye"
} | lftp
echo "Gelöscht:"
printf '  %s\n' "${zu_loeschen[@]}" "${dateien_loeschen[@]}" | grep -v '^  $' || true

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
for s in "${betroffen[@]}"; do
  noch="$(server_dateien "$s")"
  for p in "${dateien_loeschen[@]}"; do
    case "$p" in "images/blog/$s/"*)
      if grep -qxF "${p#"images/blog/$s/"}" <<<"$noch"; then echo "::error::$p liegt noch auf dem Server."; fehler=1; fi ;;
    esac
  done
done

# Kontrolle 2: Gelöschtes liefert 404, eingebundene Bilder weiter 200
if [ -n "${LIVE_URL:-}" ]; then
  http() { curl -sS -o /dev/null -m 20 -w '%{http_code}' "$1" || echo "keine Antwort"; }
  for p in "${zu_loeschen[@]}"; do
    case "$p" in blog/*)
      url="${LIVE_URL%/}/$p"; code="$(http "$url")"
      echo "$url -> $code"
      if [ "$code" != "404" ]; then echo "::error::$url liefert $code statt 404."; fehler=1; fi ;;
    esac
  done
  for p in "${dateien_loeschen[@]}"; do
    url="${LIVE_URL%/}/$p"; code="$(http "$url")"
    echo "$url -> $code"
    if [ "$code" != "404" ]; then echo "::error::$url liefert $code statt 404."; fehler=1; fi
  done
  for s in "${betroffen[@]}"; do
    ok=0; anzahl=0
    while IFS= read -r d; do
      [ -n "$d" ] || continue
      anzahl=$((anzahl + 1))
      url="${LIVE_URL%/}/images/blog/$s/$d"; code="$(http "$url")"
      if [ "$code" = "200" ]; then ok=$((ok + 1)); else echo "::error::$url liefert $code statt 200."; fehler=1; fi
    done <<<"$(export_dateien "$s")"
    echo "images/blog/$s/: $ok/$anzahl eingebundene Bilddateien liefern 200"
  done
fi
exit $fehler
