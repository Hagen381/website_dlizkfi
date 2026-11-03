import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FolgenListe from "@/components/FolgenListe";
import { seitenAnzahl, seitenPfad } from "@/lib/folgen";
import { breadcrumb, JsonLd } from "@/lib/seo";

// Blätterseiten ab 2 (Seite 1 = /episodes/). Es gibt bewusst kein /episodes/page/1/.
export function generateStaticParams() {
  return Array.from({ length: Math.max(0, seitenAnzahl - 1) }, (_, i) => ({ seite: String(i + 2) }));
}
export const dynamicParams = false;

type Props = { params: Promise<{ seite: string }> };

const nummer = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 2 && n <= seitenAnzahl ? n : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = nummer((await params).seite);
  if (!n) return {};
  return {
    title: `Alle Folgen – Seite ${n}`,
    alternates: { canonical: seitenPfad(n) },
  };
}

export default async function FolgenSeite({ params }: Props) {
  const n = nummer((await params).seite);
  if (!n) notFound();
  return (
    <>
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Folgen", pfad: "/episodes/" }, { name: `Seite ${n}`, pfad: seitenPfad(n) }])] }} />
      <FolgenListe seite={n} />
    </>
  );
}
