#!/usr/bin/env bash
# Räumt den All-Inkl-Webspace auf: entfernt Dateien und leere Ordner, die der
# aktuelle Export nicht mehr braucht. Der normale Deploy lädt ohne --delete
# hoch, alte Build-Reste (z. B. _next/static/-Chunks früherer Builds, alte
# RSC-Daten, /episodes/page/N/) bleiben sonst liegen.
#
# Nur per manuellem Lauf (Workflow „Server aufraeumen"), Löschen nur nach
# Freigabe im Chat. Regeln: CLAUDE.md, Abschnitt Server, „Server aufräumen".
#
# Ablauf:
#   1. Export vollständig? (index.html, episodes/index.html, blog/index.html,
#      sitemap.xml) — sonst Abbruch, in beiden Modi.
#   2. Live-Seiten per HTTP holen: Build-ID und alle Verweise (JS, CSS,
#      Schriften, Bilder) — die bleiben immer.
#   3. Dateiliste vom Server per FTPS (find -l): Wurzelordner (eine Ebene)
#      und die Bereiche _next/ images/ episodes/ blog/ entwurf/.
#   4. Vergleich mit dem Export (scripts/server-aufraeumen-liste.mjs).
#   5. MODUS=testlauf: nur auflisten. MODUS=loeschen: nur, wenn PRUEFSUMME
#      der Liste des Testlaufs entspricht ("genau die Testlauf-Liste"), die
#      Build-ID der Live-Seite gefunden wurde, die Live-Seite auf nichts
#      außerhalb des Exports verweist und höchstens MAX_DATEIEN betroffen
#      sind. Danach per FTPS prüfen, dass alles weg ist, und per HTTP, dass
#      die Kontrollseiten und alle ihre Dateien weiter 200 liefern.
#
# Umgebung:
#   FTP_SERVER, FTP_USERNAME, LFTP_PASSWORD   aus den Secrets (nie ausgeben)
#   MODUS          testlauf (Standard) | loeschen
#   PRUEFSUMME     im Löschmodus Pflicht: Prüfsumme aus dem Testlauf
#   EXPORT         Export-Ordner (Standard: out)
#   LIVE_URL       z. B. https://www.daslebenistzukurzfuerirgendwann.de
#   MAX_DATEIEN    Obergrenze Dateien (Standard: 3000)
#   MIN_ALTER_TAGE _next/static/ erst ab diesem Alter (Standard: 7)
#   BERICHT        Datei, an die der Bericht (Markdown) angehängt wird,
#                  z. B. $GITHUB_STEP_SUMMARY (optional)
#
# Wie im Deploy: verschlüsselt, Zertifikat geprüft, Passwort nur über
# --env-password, kein set -x, kein lftp-debug.

set -euo pipefail

MODUS="${MODUS:-testlauf}"
EXPORT="${EXPORT:-out}"
MAX_DATEIEN="${MAX_DATEIEN:-3000}"
LIVE_URL="${LIVE_URL:?LIVE_URL fehlt}"
LIVE_URL="${LIVE_URL%/}"
BERICHT="${BERICHT:-/dev/null}"
ARBEIT="$(mktemp -d)"
LISTEN="$ARBEIT/listen"; ERGEBNIS="$ARBEIT/ergebnis"
mkdir -p "$LISTEN" "$ERGEBNIS"
BEREICHE=(_next images episodes blog entwurf)
HIER="$(cd "$(dirname "$0")" && pwd)"

case "$MODUS" in testlauf|loeschen|wordpress-testlauf|wordpress) ;; *) echo "::error::MODUS muss testlauf, loeschen, wordpress-testlauf oder wordpress sein (ist: $MODUS)."; exit 1 ;; esac
# WordPress-Modus (einmalig, Auftrag 12.11.2026): feste Pfadliste der alten
# WordPress-Installation statt Vergleich, siehe server-aufraeumen-wordpress.mjs.
# Die Obergrenze MAX_DATEIEN gilt dort nicht; Prüfsumme, FTPS- und HTTP-
# Kontrolle wie sonst, zusätzlich müssen die WordPress-Adressen 404/403 liefern.
WP=false; VERGLEICH="server-aufraeumen-liste.mjs"
if [[ "$MODUS" == wordpress* ]]; then
  WP=true; VERGLEICH="server-aufraeumen-wordpress.mjs"
  BEREICHE=(wp-admin wp-content wp-includes pinterest-media)
fi
LOESCHEN=false; [[ "$MODUS" == loeschen || "$MODUS" == wordpress ]] && LOESCHEN=true

# --- 1. Export vollständig? --------------------------------------------------
for pflicht in index.html episodes/index.html blog/index.html sitemap.xml; do
  if [ ! -f "$EXPORT/$pflicht" ]; then
    echo "::error::Export unvollständig ($EXPORT/$pflicht fehlt) — es wird nichts verglichen und nichts gelöscht."
    exit 1
  fi
done

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
set ftp:list-options -a
EOF
}
# LFTP_OEFFNEN_TEST: nur für lokale Tests gegen einen eigenen FTPS-Testserver
# (z. B. open --env-password -u u ftp://localhost:2121). Im Workflow nie
# gesetzt. Verschlüsselung und Zertifikatsprüfung bleiben auch dann an.

# Löscht genau die Einträge aus $1 (kandidaten.tsv: f|d TAB Bytes TAB Pfad):
# Dateien mit rm -f (je 50 pro Befehl), dann Ordner mit rmdir (nur leere).
# Jeder Pfad steht in doppelten Anführungszeichen (RSC-Namen enthalten „$");
# Pfade mit " oder \ oder Steuerzeichen kommen nie in die Liste (geprüft).
lftp_loeschen() {
  if LC_ALL=C grep -qP '["\\\x00-\x08\x0a-\x1f]' "$1"; then
    echo "::error::Liste enthält Pfade mit Anführungszeichen, Backslash oder Steuerzeichen — nichts gelöscht."; exit 1
  fi
  {
    lftp_basis
    echo "set cmd:fail-exit false"
    awk -F'\t' '$1=="f" { z = z " \"" $3 "\""; if (++n % 50 == 0) { print "rm -f" z; z = "" } } END { if (z != "") print "rm -f" z }' "$1"
    awk -F'\t' '$1=="d" { print "rmdir \"" $3 "\"" }' "$1"
    echo "bye"
  } | lftp 2> "$ARBEIT/loeschen-fehler.txt" || true
}

# Dateiliste vom Server in $1 (Ordner) schreiben.
server_listen() {
  local ziel="$1"; mkdir -p "$ziel"; rm -f "$ziel/wurzel.txt"; for b in "${BEREICHE[@]}"; do rm -f "$ziel/$b.txt"; done
  {
    lftp_basis
    echo "find -l -d 2 . > $ziel/wurzel.txt"
    echo "set cmd:fail-exit false"
    for b in "${BEREICHE[@]}"; do echo "find -l $b/ > $ziel/$b.txt"; done
    echo "bye"
  } | lftp 2> "$ARBEIT/lftp-fehler.txt" || true   # fehlende Bereiche liefern hier einen Fehlercode
  if [ ! -s "$ziel/wurzel.txt" ] || ! grep -qE '(^|/| )index\.html$' "$ziel/wurzel.txt"; then
    echo "::error::Dateiliste vom Server konnte nicht geholt werden (Wurzelordner ohne index.html) — abgebrochen."
    grep -v -i pass "$ARBEIT/lftp-fehler.txt" | sed 's/^/  /' || true
    exit 1
  fi
  # Fehlende Bereiche sind kein Fehler (z. B. entwurf/ gab es live nie)
  grep -v -i 'pass' "$ARBEIT/lftp-fehler.txt" | sed 's/^/  (lftp) /' || true
}

# --- 2. Live-Seiten: Build-ID und Verweise -----------------------------------
folge="$(node -p "require('./content/folgen.json').folgen[0].slug")"
artikel="$(find "$EXPORT/blog" -mindepth 2 -maxdepth 2 -name index.html -printf '%h\n' | sed "s#^$EXPORT/blog/##" | sort | head -1)"
SEITEN=(/ /episodes/ /blog/ /about/ "/episodes/$folge/")
[ -n "$artikel" ] && SEITEN+=("/blog/$artikel/")

# Pfade (mit / vorne) zu lokalen Dateien aus HTML/CSS ziehen
verweise() {
  grep -oiE "(^|[\"'(, =])/[A-Za-z0-9._~%/-]+\.(js|css|woff2?|png|jpe?g|webp|svg|ico|gif|avif|txt|json)" "$1" \
    | sed -E "s#^[\"'(, =]##" | grep -v '^//' | sort -u || true
}
http_code() { curl -sS -o "${2:-/dev/null}" -m 30 -w '%{http_code}' "$1" 2>/dev/null || echo "keine-Antwort"; }

live_holen() {
  local ziel="$1" fehler=0
  : > "$ziel/live-pfade.txt"; : > "$ziel/live-build-id.txt"; : > "$ziel/seiten.txt"
  local i=0
  for s in "${SEITEN[@]}"; do
    i=$((i + 1))
    local code; code="$(http_code "$LIVE_URL$s" "$ARBEIT/seite$i.html")"
    echo "$code $s" >> "$ziel/seiten.txt"
    if [ "$code" != "200" ]; then fehler=1; continue; fi
    verweise "$ARBEIT/seite$i.html" >> "$ziel/live-pfade.txt"
  done
  # CSS nachladen: Schriften/Bilder darin
  for css in $(grep -E '\.css$' "$ziel/live-pfade.txt" | sort -u); do
    if [ "$(http_code "$LIVE_URL$css" "$ARBEIT/x.css")" = "200" ]; then verweise "$ARBEIT/x.css" >> "$ziel/live-pfade.txt"; fi
  done
  sort -u -o "$ziel/live-pfade.txt" "$ziel/live-pfade.txt"
  # Build-ID steht im RSC-Teil der Seite als "b":"<id>" (auch maskiert \"b\":\"<id>\")
  grep -oE '\\?"b\\?":\\?"[A-Za-z0-9_-]{8,64}' "$ARBEIT/seite1.html" 2>/dev/null | head -1 \
    | sed -E 's/.*"([A-Za-z0-9_-]+)$/\1/' > "$ziel/live-build-id.txt" || true
  return $fehler
}

if ! live_holen "$LISTEN"; then
  echo "::warning::Nicht alle Kontrollseiten liefern 200:"; sed 's/^/  /' "$LISTEN/seiten.txt"
  if $LOESCHEN; then echo "::error::Live-Seite nicht in Ordnung — es wird nichts gelöscht."; exit 1; fi
fi
echo "Kontrollseiten (vorher):"; sed 's/^/  /' "$LISTEN/seiten.txt"

# --- 3./4. Server-Liste holen und vergleichen --------------------------------
server_listen "$LISTEN"
vergleich_ok=true
node "$HIER/$VERGLEICH" "$LISTEN" "$EXPORT" "$ERGEBNIS" > "$ARBEIT/bericht-konsole.txt" || vergleich_ok=false
pruefsumme="$(cat "$ERGEBNIS/pruefsumme.txt")"
anzahl="$(cat "$ERGEBNIS/anzahl.txt")"

{
  echo "## Server aufräumen — ${MODUS^^}"
  echo
  cat "$ERGEBNIS/bericht.md"
} | tee -a "$BERICHT"

echo
echo "::group::Vollständige Liste (Bytes, Pfad)"
if [ -s "$ERGEBNIS/kandidaten.tsv" ]; then
  awk -F'\t' '{ printf "  %-6s %10s  %s%s\n", ($1=="d"?"Ordner":"Datei"), ($1=="d"?"":$2), $3, ($1=="d"?"/":"") }' "$ERGEBNIS/kandidaten.tsv"
else
  echo "  (leer)"
fi
echo "::endgroup::"
{
  echo
  echo "<details><summary>Vollständige Liste ($anzahl Dateien)</summary>"
  echo
  echo '```'
  awk -F'\t' '{ print ($1=="d" ? $3"/" : $3) }' "$ERGEBNIS/kandidaten.tsv"
  echo '```'
  echo "</details>"
} >> "$BERICHT"
while IFS= read -r w; do [ -n "$w" ] && echo "::warning::$w"; done < "$ERGEBNIS/warnungen.txt"
if ! $vergleich_ok; then
  echo "::error::Abbruch: Die Liste würde Einträge außerhalb der erlaubten Pfade, aus dem Export oder mit unsicheren Namen betreffen (siehe ABBRUCH im Bericht). Nichts gelöscht."
  exit 1
fi

if ! $WP && [ "$anzahl" -gt "$MAX_DATEIEN" ]; then
  echo "::error::$anzahl Dateien wären betroffen (Obergrenze $MAX_DATEIEN) — im Löschmodus wird abgebrochen."
  $LOESCHEN && exit 1
fi

if ! $LOESCHEN; then
  ziel="loeschen"; $WP && ziel="wordpress"
  echo
  echo "TESTLAUF: nichts gelöscht. Für den Löschlauf: modus=$ziel, pruefsumme=$pruefsumme"
  { echo; echo "**TESTLAUF: nichts gelöscht.** Löschlauf nur nach Freigabe mit \`modus=$ziel\` und \`pruefsumme=$pruefsumme\`."; } >> "$BERICHT"
  exit 0
fi

# --- 5. Löschmodus: Schutzprüfungen ------------------------------------------
if [ "${PRUEFSUMME:-}" != "$pruefsumme" ]; then
  echo "::error::Prüfsumme der Liste ($pruefsumme) stimmt nicht mit der Freigabe (${PRUEFSUMME:-leer}) überein — der Server oder der Export hat sich seit dem Testlauf geändert. Neuen Testlauf starten. Nichts gelöscht."
  exit 1
fi
if ! $WP && [ ! -s "$LISTEN/live-build-id.txt" ]; then
  echo "::error::Build-ID der Live-Seite nicht gefunden — nichts gelöscht."; exit 1
fi
if [ -s "$ERGEBNIS/live-abweichung.txt" ]; then
  echo "::error::Die Live-Seite verweist auf Dateien, die nicht im Export stehen (Server nicht auf dem Stand des Exports) — nichts gelöscht."
  sed 's/^/  /' "$ERGEBNIS/live-abweichung.txt"; exit 1
fi
if [ "$anzahl" -eq 0 ] && ! grep -q '^d' "$ERGEBNIS/kandidaten.tsv"; then
  echo "Nichts zu löschen."; exit 0
fi

# --- 6. Löschen: genau die Liste, Dateien einzeln, dann leere Ordner ---------
lftp_loeschen "$ERGEBNIS/kandidaten.tsv"
grep -v -i pass "$ARBEIT/loeschen-fehler.txt" | head -50 | sed 's/^/  (lftp) /' || true
echo "Gelöscht: $anzahl Dateien, $(grep -c '^d' "$ERGEBNIS/kandidaten.tsv" || true) Ordner."

# Kontrolle 1: per FTPS — ist alles weg?
fehler=0
server_listen "$ARBEIT/nachher"
cat "$ARBEIT/nachher/wurzel.txt" $(for b in "${BEREICHE[@]}"; do [ -f "$ARBEIT/nachher/$b.txt" ] && echo "$ARBEIT/nachher/$b.txt"; done) | sed -E 's#\r$##; s#^.*[0-9]{4}-[0-9]{2}-[0-9]{2}( [0-9:]+)? ##; s#^\./##; s#/+$##' | sort -u > "$ARBEIT/nachher-pfade.txt"
awk -F'\t' '{ print $3 }' "$ERGEBNIS/kandidaten.tsv" | sort -u > "$ARBEIT/weg-soll.txt"
noch="$(comm -12 "$ARBEIT/weg-soll.txt" "$ARBEIT/nachher-pfade.txt")"
if [ -n "$noch" ]; then
  echo "::error::$(echo "$noch" | wc -l) Einträge liegen noch auf dem Server:"; echo "$noch" | head -50 | sed 's/^/  /'; fehler=1
else
  echo "Kontrolle FTPS: alle $(wc -l < "$ARBEIT/weg-soll.txt") Einträge entfernt."
fi
# Nichts aus dem Export darf fehlen, das vorher da war
(cd "$EXPORT" && find . -type f -printf '%P\n' | sort -u) > "$ARBEIT/export-pfade.txt"
cat "$LISTEN"/wurzel.txt $(for b in "${BEREICHE[@]}"; do [ -f "$LISTEN/$b.txt" ] && echo "$LISTEN/$b.txt"; done) | sed -E 's#\r$##; s#^.*[0-9]{4}-[0-9]{2}-[0-9]{2}( [0-9:]+)? ##; s#^\./##; s#/+$##' | sort -u > "$ARBEIT/vorher-pfade.txt"
fehlt="$(comm -12 "$ARBEIT/export-pfade.txt" "$ARBEIT/vorher-pfade.txt" | comm -23 - "$ARBEIT/nachher-pfade.txt")"
if [ -n "$fehlt" ]; then
  echo "::error::Dateien des Exports fehlen nach dem Löschen auf dem Server:"; echo "$fehlt" | head -50 | sed 's/^/  /'; fehler=1
fi

# Kontrolle 2: per HTTP — Kontrollseiten und alle ihre Dateien liefern 200
live_holen "$ARBEIT/nachher" || true
echo "Kontrollseiten (nachher):"; sed 's/^/  /' "$ARBEIT/nachher/seiten.txt"
if grep -qv '^200 ' "$ARBEIT/nachher/seiten.txt"; then echo "::error::Nicht alle Kontrollseiten liefern 200."; fehler=1; fi
ok=0; alle=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  alle=$((alle + 1))
  code="$(http_code "$LIVE_URL$p")"
  if [ "$code" = "200" ]; then ok=$((ok + 1)); else echo "::error::$LIVE_URL$p liefert $code statt 200."; fehler=1; fi
done < "$ARBEIT/nachher/live-pfade.txt"
echo "Kontrolle HTTP: $ok/$alle eingebundene Dateien (JS, CSS, Schriften, Bilder) liefern 200."
wp_zeile=""
if $WP; then
  # Die alten WordPress-Adressen dürfen nichts mehr ausliefern
  wp_ok=0; wp_alle=0
  for p in /wp-login.php /wp-admin/ /xmlrpc.php /readme.html /index.htm /license.txt /index.php /wp-content/ /wp-includes/ /pinterest-media/; do
    wp_alle=$((wp_alle + 1))
    code="$(http_code "$LIVE_URL$p")"
    case "$code" in
      404|403|410) wp_ok=$((wp_ok + 1)); echo "  $code $p" ;;
      *) echo "::error::$LIVE_URL$p liefert $code (erwartet 404 oder 403)."; fehler=1 ;;
    esac
  done
  echo "Kontrolle WordPress-Adressen: $wp_ok/$wp_alle liefern 404/403."
  wp_zeile="- WordPress-Adressen: $wp_ok/$wp_alle liefern 404/403"
fi
{
  echo
  echo "### Löschlauf"
  echo
  echo "- Gelöscht: $anzahl Dateien, $(grep -c '^d' "$ERGEBNIS/kandidaten.tsv" || true) leere Ordner"
  echo "- FTPS-Kontrolle: $([ -z "$noch" ] && echo 'alles entfernt' || echo 'RESTE, siehe Protokoll')"
  echo "- HTTP-Kontrolle: $(grep -c '^200 ' "$ARBEIT/nachher/seiten.txt")/${#SEITEN[@]} Seiten 200, $ok/$alle Dateien 200"
  if [ -n "$wp_zeile" ]; then echo "$wp_zeile"; fi
} >> "$BERICHT"
exit $fehler
