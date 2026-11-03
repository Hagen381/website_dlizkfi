import type { Metadata } from "next";
import EntwurfHinweis from "@/components/EntwurfHinweis";
import Mailadresse from "@/components/Mailadresse";
import Platzhalter from "@/components/Platzhalter";
import Textseite from "@/components/Textseite";
import { breadcrumb, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum/" },
};

// GERÜST — alle Angaben folgen. Nichts erfinden.
export default function Impressum() {
  return (
    <Textseite>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Impressum", pfad: "/impressum/" }])] }} />
      <EntwurfHinweis>Gerüst – die Angaben folgen und werden vor dem Live-Gang ergänzt und geprüft.</EntwurfHinweis>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <Platzhalter>Name</Platzhalter>
        <br />
        <Platzhalter>Straße und Hausnummer</Platzhalter>
        <br />
        <Platzhalter>PLZ und Ort</Platzhalter>
        <br />
        <Platzhalter>Land</Platzhalter>
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Mailadresse />
        <br />
        Telefon: <Platzhalter>falls gewünscht</Platzhalter>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <Platzhalter>Name und Anschrift</Platzhalter>
      </p>

      <h2>Weitere Angaben</h2>
      <p>
        <Platzhalter>ggf. Umsatzsteuer-ID, Registereintrag, Hinweis zur Verbraucherstreitbeilegung – falls zutreffend</Platzhalter>
      </p>
    </Textseite>
  );
}
