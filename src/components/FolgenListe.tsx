import Link from "next/link";
import FolgenKarte from "@/components/FolgenKarte";
import FolgenSuche from "@/components/FolgenSuche";
import { folgenAufSeite, seitenAnzahl, seitenPfad } from "@/lib/folgen";

// "Alle Folgen" — 12 pro Seite, Seite 1 auf /episodes/, weitere auf
// /episodes/page/N/. Gemeinsame Ansicht für beide Routen.
export default function FolgenListe({ seite }: { seite: number }) {
  const liste = folgenAufSeite(seite);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8 sm:pt-10">
      <FolgenSuche titel={<h1 className="text-3xl font-bold">{seite > 1 ? `Alle Folgen – Seite ${seite}` : "Alle Folgen"}</h1>}>
        <ul className="space-y-4">
          {liste.map((f) => (
            <li key={f.slug}>
              <FolgenKarte folge={f} ueberschrift="h2" />
            </li>
          ))}
        </ul>
        <nav aria-label="Seiten" className="mt-10">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {seite > 1 && (
              <li>
                <Link href={seitenPfad(seite - 1)} rel="prev" className="kipp kipp-dezent inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 font-medium">
                  « Zurück
                </Link>
              </li>
            )}
            <li className="px-4 py-2 text-muted">
              Seite {seite} von {seitenAnzahl}
            </li>
            {seite < seitenAnzahl && (
              <li>
                <Link href={seitenPfad(seite + 1)} rel="next" className="kipp kipp-dezent inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 font-medium">
                  Weiter »
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </FolgenSuche>
    </div>
  );
}
