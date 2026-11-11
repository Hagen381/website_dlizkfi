import Link from "next/link";
import { BlogBildRoh } from "@/components/BlogBild";
import Cover from "@/components/Cover";
import { datumLesbar, type Artikel } from "@/lib/blog";

// Karte für /blog/ (3D-Hover: .kipp .kipp-karte in globals.css, Neigung über KippSteuerung): Kartenbild (Frontmatter kartenbild, sonst erstes Bild), Titel, Datum, Beschreibung.
export default function BlogKarte({ a, vorrang = false }: { a: Artikel; vorrang?: boolean }) {
  return (
    <article className="kipp kipp-karte group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-[4/3] overflow-hidden bg-border/40">
        {a.kartenbild ? (
          <BlogBildRoh bild={a.kartenbild} priority={vorrang} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" style={{ objectPosition: a.kartenbildPosition }} className="kipp-bild h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <Cover groesse={400} sizes="400px" className="h-full w-full" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-sm text-muted">
          <time dateTime={a.datum}>{datumLesbar(a.datum)}</time>
          {a.entwurf && <span className="ml-2 rounded bg-secondary/20 px-1.5 text-xs font-semibold text-text">Entwurf</span>}
        </p>
        <h2 className="mt-2 font-heading text-xl leading-snug font-bold text-balance">
          <Link href={`/blog/${a.slug}/`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {a.titel}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-4 text-muted">{a.beschreibung}</p>
      </div>
    </article>
  );
}
