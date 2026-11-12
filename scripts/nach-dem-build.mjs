// Läuft nach "next build" + Bildoptimierung (npm run build).
//  1. Entfernt den Platzhalter /blog/_noch-keine-artikel/ (nur nötig, solange
//     es keine Blogartikel gibt — Static Export braucht einen Parameter).
//  2. Live-Build (ohne NEXT_BUILD_BASE_PATH): schreibt out/.htaccess.
//     Der Vorschau-Build für GitHub Pages bekommt keine .htaccess.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(wurzel, "out");
if (!fs.existsSync(path.join(out, "index.html"))) {
  console.error("out/index.html fehlt — Build unvollständig.");
  process.exit(1);
}

for (const rest of ["blog/_noch-keine-artikel"]) {
  const p = path.join(out, rest);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`Platzhalter entfernt: out/${rest}/`);
  }
}
for (const datei of fs.readdirSync(path.join(out, "blog"), { withFileTypes: true }).filter((d) => d.isFile() && d.name.includes("_noch-keine-artikel"))) {
  fs.rmSync(path.join(out, "blog", datei.name));
}

if (process.env.NEXT_BUILD_BASE_PATH) {
  console.log("Vorschau-Build: keine .htaccess.");
  process.exit(0);
}

// Domain aus site-config lesen (steht dort genau einmal)
const config = fs.readFileSync(path.join(wurzel, "src/lib/site-config.ts"), "utf8");
const url = config.match(/url:\s*"(https:\/\/www\.[^"]+)"/)?.[1];
if (!url) {
  console.error("Live-Domain (mit www) nicht in src/lib/site-config.ts gefunden.");
  process.exit(1);
}
const host = new URL(url).host; // www.…
const ohneWww = host.replace(/^www\./, "");
const esc = (s) => s.replace(/\./g, "\\.");

const htaccess = `# =====================================================================
# Von scripts/nach-dem-build.mjs erzeugt — nicht von Hand bearbeiten.
# =====================================================================

Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset UTF-8

<IfModule mod_rewrite.c>
RewriteEngine On

# http -> https und ohne www -> mit www, in EINEM 301-Schritt (Ziel immer www)
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} ^${esc(ohneWww)}$ [NC]
RewriteRule ^(.*)$ https://${host}/$1 [R=301,L]

# Alte PodView-Sitemaps -> /sitemap.xml (Query wie ?page=1 wird verworfen)
RewriteRule ^sitemap-(pages|episodes)\\.xml$ /sitemap.xml? [R=301,L]

# Blätterseiten gibt es nicht mehr (seit 12.11.2026 enthält das Register auf
# /episodes/ alle Folgen). Je EIN 301 direkt auf /episodes/, keine Kette:
# - /episodes/page/N/ (eigene Blätterseiten bis 12.11.2026; alte Ordner auf
#   dem Server bleiben liegen, die Regel greift vor der Auslieferung)
# - /episodes/?page=N (PodView)
RewriteRule ^episodes/page(/[0-9]+)?/?$ /episodes/? [R=301,L]
RewriteCond %{QUERY_STRING} (^|&)page=[0-9]+(&|$)
RewriteRule ^episodes/?$ /episodes/? [R=301,L]

# Fehlenden Schrägstrich am Ende ergänzen (nur für vorhandene Ordner)
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_URI} !/$
RewriteRule ^(.*)$ /$1/ [R=301,L]
</IfModule>

<IfModule mod_mime.c>
AddType font/woff2 .woff2
AddType application/rss+xml .rss
AddType image/svg+xml .svg
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"

</IfModule>

<IfModule mod_expires.c>
ExpiresActive On
ExpiresDefault "access plus 1 hour"
ExpiresByType text/html "access plus 0 seconds"
ExpiresByType application/xml "access plus 1 hour"
ExpiresByType text/xml "access plus 1 hour"
ExpiresByType application/json "access plus 1 hour"
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType text/javascript "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/svg+xml "access plus 1 month"
ExpiresByType image/x-icon "access plus 1 month"
ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
# Dateien mit Hash im Namen ändern sich nie
<FilesMatch "\\.(js|css|woff2)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(jpe?g|png|webp)$">
Header set Cache-Control "public, max-age=31536000"
</FilesMatch>
<FilesMatch "\\.(svg|ico)$">
Header set Cache-Control "public, max-age=2592000"
</FilesMatch>
<FilesMatch "\\.(html|xml|txt|json)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/xml application/json application/javascript text/javascript image/svg+xml
</IfModule>
`;
fs.writeFileSync(path.join(out, ".htaccess"), htaccess);
console.log(`out/.htaccess geschrieben (Domain ${host}).`);
