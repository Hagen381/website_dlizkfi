import type { Metadata } from "next";
import Link from "next/link";
import Anschrift from "@/components/Anschrift";
import EntwurfHinweis from "@/components/EntwurfHinweis";
import Mailadresse from "@/components/Mailadresse";
import Platzhalter from "@/components/Platzhalter";
import Textseite from "@/components/Textseite";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  alternates: { canonical: "/privacy/" },
};

// ENTWURF für die statische Seite bei All-Inkl. Muss vor dem Live-Gang
// geprüft werden. Platzhalter in [eckigen Klammern] sind noch offen.
export default function Datenschutz() {
  return (
    <Textseite>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Datenschutzerklärung", pfad: "/privacy/" }])] }} />
      <EntwurfHinweis>Entwurf – wird geprüft. Diese Datenschutzerklärung ist noch nicht rechtlich geprüft und nicht final.</EntwurfHinweis>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich für diese Website ist:
        <br />
        <Anschrift />
        <br />
        E-Mail: <Mailadresse />
      </p>

      <h2>2. Das Wichtigste in Kürze</h2>
      <ul>
        <li>Diese Website ist eine rein statische Seite. Es gibt keine Kundenkonten, keine Formulare und keine Kommentarfunktion.</li>
        <li>Wir setzen keine Cookies und verwenden keine Tracking- oder Analysewerkzeuge (kein Google Analytics, keine Pixel, keine Social-Media-Plugins).</li>
        <li>Schriften und Bilder liegen auf unserem eigenen Server. Beim Aufruf einer Seite werden keine Daten an Dritte übertragen.</li>
        <li>Erst wenn du auf „Abspielen“ drückst, wird die Audiodatei der Folge von Spotify (anchor.fm) geladen.</li>
      </ul>

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Diese Website wird bei ALL-INKL.COM – Neue Medien Münnich, Hauptstraße 68, 02742 Friedersdorf, gehostet{" "}
        <Platzhalter>Anschrift und Auftragsverarbeitungsvertrag mit All-Inkl prüfen</Platzhalter>. Beim Aufruf der Website verarbeitet der Server automatisch Daten, die
        dein Browser übermittelt, und speichert sie in Logfiles:
      </p>
      <ul>
        <li>IP-Adresse des anfragenden Geräts</li>
        <li>Datum und Uhrzeit des Zugriffs</li>
        <li>aufgerufene Seite bzw. Datei und übertragene Datenmenge</li>
        <li>Statusmeldung (z. B. ob der Abruf erfolgreich war)</li>
        <li>Website, von der aus der Zugriff erfolgte (Referrer)</li>
        <li>Browsertyp, Betriebssystem und Gerät (User-Agent)</li>
      </ul>
      <p>
        Die Verarbeitung ist für den sicheren und stabilen Betrieb der Website erforderlich und dient der Erkennung und Abwehr von Angriffen. Aus den Logfiles erstellt der
        Hoster außerdem eine anonyme Zugriffsstatistik (Seitenaufrufe), die wir zur Einschätzung der Reichweite nutzen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse am sicheren Betrieb und an der Reichweitenmessung ohne Tracking). Die Logfiles werden nach{" "}
        <Platzhalter>Speicherdauer laut All-Inkl-Einstellung eintragen</Platzhalter> gelöscht bzw. anonymisiert.
      </p>

      <h2>4. Abspielen von Podcast-Folgen</h2>
      <p>
        Die Folgen werden über Spotify for Creators (Anchor) bereitgestellt. Der Player auf dieser Website lädt die Audiodatei erst, wenn du auf „Abspielen“ drückst. Vorher
        wird keine Verbindung zu Spotify aufgebaut.
      </p>
      <p>
        Sobald du abspielst, lädt dein Browser die Audiodatei direkt von Servern von Spotify (anchor.fm) und deren Auslieferungsnetz (Amazon CloudFront). Dabei werden deine
        IP-Adresse, Datum und Uhrzeit, die abgerufene Datei sowie Angaben zu Browser und Gerät an diese Anbieter übertragen. Anbieter ist die Spotify AB, Regeringsgatan 19, 111
        53 Stockholm, Schweden <Platzhalter>Angaben zu Spotify prüfen</Platzhalter>. Dabei kann es auch zu einer Übermittlung in Drittländer wie die USA kommen. Spotify nutzt
        diese Daten unter anderem für Abrufstatistiken des Podcasts. Näheres findest du in der Datenschutzerklärung von Spotify:{" "}
        <a href="https://www.spotify.com/de/legal/privacy-policy/" target="_blank" rel="noopener">
          spotify.com/de/legal/privacy-policy
        </a>
        .
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, die Folgen auf dieser Website anhören zu können). Du kannst die Übertragung vermeiden, indem du
        nicht auf „Abspielen“ drückst.
      </p>

      <h2>5. Links zu Podcast-Plattformen und sozialen Netzwerken</h2>
      <p>
        Diese Website enthält einfache Links zu Plattformen wie Apple Podcasts, Spotify oder YouTube. Es handelt sich um normale Links, keine eingebetteten Inhalte. Erst wenn
        du einen Link anklickst, verlässt du diese Website; dann gilt die Datenschutzerklärung des jeweiligen Anbieters.
      </p>

      <h2>6. Kontakt per E-Mail</h2>
      <p>
        Wenn du uns eine E-Mail schreibst, verarbeiten wir deine Angaben (E-Mail-Adresse, Name, Inhalt der Nachricht), um deine Anfrage zu beantworten. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. f DSGVO bzw. Art. 6 Abs. 1 lit. b DSGVO, wenn deine Anfrage auf einen Vertrag zielt. Wir löschen die Daten, wenn sie nicht mehr erforderlich sind und
        keine gesetzlichen Aufbewahrungspflichten bestehen.
      </p>

      <h2>7. Cookies und lokale Speicherung</h2>
      <p>
        Diese Website setzt keine Cookies und speichert keine Informationen auf deinem Gerät. Eine Einwilligung nach § 25 TDDDG ist daher nicht erforderlich. Es gibt keinen
        Cookie-Banner, weil es nichts gibt, dem du zustimmen müsstest.
      </p>

      <h2>8. Deine Rechte</h2>
      <p>Du hast im Rahmen der gesetzlichen Vorgaben jederzeit das Recht auf</p>
      <ul>
        <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO).</li>
      </ul>
      <p>
        Wende dich dafür an <Mailadresse />. Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO){" "}
        <Platzhalter>zuständige Aufsichtsbehörde ergänzen</Platzhalter>.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die rechtlichen Vorgaben ändern. Stand: <Platzhalter>Datum nach Prüfung eintragen</Platzhalter>
      </p>
      <p>
        Siehe auch das <Link href="/impressum/">Impressum</Link> von {siteConfig.name}.
      </p>
    </Textseite>
  );
}
