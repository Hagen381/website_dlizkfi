import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import { datumKurz } from "@/lib/folgen";
import type { FolgenFoto } from "@/lib/folgen-foto";

// Suchtreffer „Blogartikel“ auf /episodes/ (FolgenSuche). Aufbau wie
// FolgenKarte (gleiche Bildgröße 64/96 px, ganze Karte anklickbar, 3D-Hover
// .kipp .kipp-karte), aber ohne Play-Knopf und mit Marke „Blogartikel“.
export type TrefferArtikel = { slug: string; titel: string; datum: string; beschreibung: string; foto: FolgenFoto; entwurf?: boolean };

export default function ArtikelTrefferKarte({ artikel }: { artikel: TrefferArtikel }) {
  return (
    <article className="kipp kipp-karte group relative flex gap-4 rounded-lg border border-border bg-surface p-4 sm:gap-6 sm:p-6">
      <BlogBildRoh bild={{ src: artikel.foto.src, alt: "", width: 96, height: 96 }} className="aspect-square h-16 w-16 shrink-0 rounded-md object-cover shadow-sm sm:h-24 sm:w-24" style={{ objectPosition: artikel.foto.position }} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-full bg-primary px-2.5 py-0.5 font-heading text-xs font-semibold text-text">Blogartikel</span>
          {artikel.entwurf && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">Entwurf</span>}
          <time dateTime={artikel.datum}>{datumKurz(artikel.datum)}</time>
        </p>
        <h2 className="mt-1 font-heading text-base leading-snug font-semibold [overflow-wrap:anywhere] sm:text-lg">
          <Link href={`/blog/${artikel.slug}/`} className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none group-focus-within:underline hover:underline">
            {artikel.titel}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-2 max-w-[65ch] text-sm break-words text-muted sm:text-base">{artikel.beschreibung}</p>
      </div>
    </article>
  );
}
