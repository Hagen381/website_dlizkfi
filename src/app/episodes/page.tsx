import type { Metadata } from "next";
import AltePaginierung from "@/components/AltePaginierung";
import FolgenListe from "@/components/FolgenListe";
import { seitenAnzahl } from "@/lib/folgen";
import { breadcrumb, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Alle Folgen",
  description: "Alle Folgen von „Das Leben ist zu kurz für irgendwann“: Auswandern nach Thailand, Familie, Mut und das Leben auf Koh Samui.",
  alternates: { canonical: "/episodes/" },
};

export default function Folgen() {
  return (
    <>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Folgen", pfad: "/episodes/" }])] }} />
      <AltePaginierung maxSeite={seitenAnzahl} />
      <FolgenListe seite={1} />
    </>
  );
}
