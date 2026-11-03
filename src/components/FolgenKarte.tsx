import Link from "next/link";
import Cover from "@/components/Cover";
import PlayKnopf from "@/components/PlayKnopf";
import { datumKurz, dauerGesprochen, dauerText, type Folge } from "@/lib/folgen";

export type KartenFolge = Pick<Folge, "slug" | "titel" | "datum" | "dauer" | "mp3" | "beschreibung">;

// Folgenkarte wie in "Neueste Folgen" / "Alle Folgen" der Live-Seite.
// Die ganze Karte ist anklickbar (Link über dem Titel, per ::after gestreckt),
// der Play-Knopf liegt darüber.
export default function FolgenKarte({ folge, ueberschrift = "h3" }: { folge: KartenFolge; ueberschrift?: "h2" | "h3" }) {
  const H = ueberschrift;
  return (
    <article className="group relative flex gap-4 rounded-lg border border-border bg-surface p-4 shadow-xs transition hover:shadow-md sm:gap-6 sm:p-6">
      <Cover groesse={96} sizes="(min-width: 640px) 96px, 64px" className="h-16 w-16 shrink-0 rounded-md shadow-sm sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          <time dateTime={folge.datum}>{datumKurz(folge.datum)}</time>
          {folge.dauer != null && (
            <>
              <span aria-hidden="true"> · </span>
              <span aria-hidden="true">{dauerText(folge.dauer)}</span>
              <span className="sr-only">, Dauer {dauerGesprochen(folge.dauer)}</span>
            </>
          )}
        </p>
        <H className="mt-1 font-heading text-base leading-snug font-semibold [overflow-wrap:anywhere] sm:text-lg">
          <Link href={`/episodes/${folge.slug}/`} className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none group-focus-within:underline hover:underline">
            {folge.titel}
          </Link>
        </H>
        <p className="mt-2 line-clamp-2 max-w-[65ch] text-sm break-words text-muted sm:text-base">{folge.beschreibung}</p>
        {folge.mp3 && (
          <div className="mt-4 sm:hidden">
            <PlayKnopf src={folge.mp3} titel={folge.titel} />
          </div>
        )}
      </div>
      {folge.mp3 && (
        <div className="hidden sm:block">
          <PlayKnopf src={folge.mp3} titel={folge.titel} />
        </div>
      )}
    </article>
  );
}
