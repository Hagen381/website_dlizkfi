import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import PlayKnopf from "@/components/PlayKnopf";
import { datumKurz, dauerGesprochen, dauerText, type Folge } from "@/lib/folgen";
import type { FolgenFoto } from "@/lib/folgen-foto";

// foto: aus src/lib/folgen-foto.ts (fotoZurFolge) — auf der Startseite direkt,
// in den Suchtreffern über /suche.json
export type KartenFolge = Pick<Folge, "slug" | "titel" | "datum" | "dauer" | "mp3" | "beschreibung"> & { foto: FolgenFoto };

// Folgenkarte wie in "Neueste Folgen" / "Alle Folgen" der Live-Seite.
// Die ganze Karte ist anklickbar (Link über dem Titel, per ::after gestreckt),
// der Play-Knopf liegt darüber. 3D-Hover wie die Blog-Karten (.kipp .kipp-karte).
// Bild: das Foto zur Folge (gleiche Größe wie früher das Cover: 64 px, ab
// 640 px 96 px), lazy, Alt-Text leer — der Titel steht daneben.
export default function FolgenKarte({ folge, ueberschrift = "h3" }: { folge: KartenFolge; ueberschrift?: "h2" | "h3" }) {
  const H = ueberschrift;
  return (
    <article className="kipp kipp-karte group relative flex gap-4 rounded-lg border border-border bg-surface p-4 sm:gap-6 sm:p-6">
      <BlogBildRoh bild={{ src: folge.foto.src, alt: "", width: 96, height: 96 }} className="aspect-square h-16 w-16 shrink-0 rounded-md object-cover shadow-sm sm:h-24 sm:w-24" style={{ objectPosition: folge.foto.position }} />
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
