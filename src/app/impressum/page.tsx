import type { Metadata } from "next";
import Anschrift from "@/components/Anschrift";
import Mailadresse from "@/components/Mailadresse";
import Textseite from "@/components/Textseite";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum/" },
};

// Name, Anschrift und Mailadresse kommen aus src/lib/site-config.ts
// (siteConfig.verantwortlich, siteConfig.kontaktEmail). Telefon bewusst
// weggelassen.
export default function Impressum() {
  return (
    <Textseite>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Impressum", pfad: "/impressum/" }])] }} />
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <Anschrift />
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Mailadresse />
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{siteConfig.verantwortlich.name}, Anschrift wie oben</p>
    </Textseite>
  );
}
