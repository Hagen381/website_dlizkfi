#!/usr/bin/env bash
# lftp im GitHub-Runner installieren — ohne auf apt angewiesen zu sein.
# Genutzt von deploy-allinkl.yml (auch Montagslauf) und blog-aufraeumen.yml.
#
# Reihenfolge:
#   1. Ubuntu-Paket aus dem Actions-Cache (~/lftp-deb, vom Workflow per
#      actions/cache/restore bereitgelegt) → dpkg -i, kein Netz nötig.
#   2. apt (bei gestörtem Azure-Spiegel einmal mit archive.ubuntu.com). Bei
#      Erfolg wird das .deb nach ~/lftp-deb gelegt und der Workflow speichert
#      es im Cache (Ausgabe cache_neu=true).
#   3. conda-forge über micromamba (Version + SHA-256 fest) — lftp 4.9.3 mit
#      OpenSSL. Damit die Zertifikatsprüfung den System-CA-Bestand nutzt, wird
#      nur in diesem Fall ssl:ca-file in ~/.lftprc gesetzt.
#
# Die Sicherheitsregeln stehen weiter in den lftp-Befehlen der Workflows bzw.
# in scripts/blog-aufraeumen.sh (ftp:ssl-force, ftp:ssl-protect-data,
# ssl:verify-certificate, --env-password) und werden hier nicht berührt.
# Kein set -x.
set -euo pipefail

DEB_DIR="$HOME/lftp-deb"
MM_VERSION="2.0.5-0"
MM_SHA256="cdf5a2e18d213617b6c5c32d8763b4e8fc05f8173b4f4017997683cb984357eb"
LFTP_CONDA="lftp=4.9.3=h81d5518_2"
TMP="${RUNNER_TEMP:-/tmp}"

ausgabe() { [ -n "${GITHUB_OUTPUT:-}" ] && echo "$1=$2" >> "$GITHUB_OUTPUT" || true; }
ausgabe cache_neu false

APT_OPT=(-o Acquire::Retries=1 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20)
apt_versuch() {
  timeout 240 sudo apt-get update -qq "${APT_OPT[@]}" && timeout 240 sudo apt-get install -y -qq "${APT_OPT[@]}" lftp >/dev/null
}
apt_installieren() {
  apt_versuch && return 0
  echo "apt: Paketspiegel gestört - versuche archive.ubuntu.com."
  echo "http://archive.ubuntu.com/ubuntu/" | sudo tee /etc/apt/apt-mirrors.txt >/dev/null
  apt_versuch
}

conda_installieren() {
  local mm="$TMP/micromamba"
  curl -fsSL --retry 3 -o "$mm" "https://github.com/mamba-org/micromamba-releases/releases/download/$MM_VERSION/micromamba-linux-64"
  echo "$MM_SHA256  $mm" | sha256sum -c --quiet -
  chmod +x "$mm"
  "$mm" create -y -q -r "$TMP/mamba" -p "$TMP/lftp-env" -c conda-forge --override-channels "$LFTP_CONDA" >/dev/null
  # Nur lftp selbst in den PATH (nicht das ganze Umfeld mit openssl usw.)
  mkdir -p "$TMP/lftp-bin"
  ln -sf "$TMP/lftp-env/bin/lftp" "$TMP/lftp-bin/lftp"
  [ -n "${GITHUB_PATH:-}" ] && echo "$TMP/lftp-bin" >> "$GITHUB_PATH"
  export PATH="$TMP/lftp-bin:$PATH"
  # conda-OpenSSL sucht Zertifikate sonst unter seinem eigenen Präfix.
  echo 'set ssl:ca-file "/etc/ssl/certs/ca-certificates.crt"' >> "$HOME/.lftprc"
}

quelle=""
if compgen -G "$DEB_DIR/lftp_*.deb" >/dev/null && sudo dpkg -i "$DEB_DIR"/lftp_*.deb >/dev/null 2>&1; then
  quelle="Actions-Cache (Ubuntu-Paket)"
elif apt_installieren; then
  quelle="apt"
  mkdir -p "$DEB_DIR"
  if cp /var/cache/apt/archives/lftp_*.deb "$DEB_DIR"/ 2>/dev/null || (cd "$DEB_DIR" && timeout 120 apt-get download -qq lftp); then
    ausgabe cache_neu true
  fi
else
  echo "apt nicht verfügbar - nehme lftp von conda-forge."
  conda_installieren
  quelle="conda-forge ($LFTP_CONDA)"
fi

echo "lftp installiert aus: $quelle"
lftp --version | head -1
ausgabe quelle "$quelle"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "- lftp aus: $quelle" >> "$GITHUB_STEP_SUMMARY" || true
