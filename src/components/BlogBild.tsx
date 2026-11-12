import ExportedImage from "next-image-export-optimizer";
import { basePath } from "@/lib/base-path";
import type { CSSProperties } from "react";
import type { ArtikelBild } from "@/lib/blog";

// Blogbild über dieselbe Pipeline wie das Cover (next-image-export-optimizer):
// basePath-fest, placeholder="empty" (keine Blur-Bilder), lazy, responsive.
// Hochformat wird auf max. 620 px Höhe begrenzt (object-fit: cover).
// Ohne `sizes` gibt es nur 1x/2x-Kandidaten zur Breite `bild.width` (kurzes
// srcset, z. B. für die kleinen Polaroids im Startseiten-Entwurf).
// wichtig: für das LCP-Bild — Next 16 `preload` (ersetzt das veraltete
// priority: nicht lazy + <link rel="preload" as="image"> mit imagesrcset/
// imagesizes im <head>) und fetchpriority="high". Ohne den Preload entdeckte
// der Browser das Bild mobil erst spät (Lighthouse „Load Delay“ ~1,6 s).
export function BlogBildRoh({ bild, sizes, className = "", priority = false, wichtig = false, style }: { bild: ArtikelBild; sizes?: string; className?: string; priority?: boolean; wichtig?: boolean; style?: CSSProperties }) {
  return (
    <ExportedImage
      // Ohne führenden Schrägstrich: die Bibliothek setzt den basePath davor
      // (Vorschau /website_dlizkfi/images/…, live /images/…). Mit "/" stünde
      // in den RSC-Daten ein Pfad ohne basePath.
      src={bild.src.replace(/^\//, "")}
      alt={bild.alt}
      width={bild.width}
      height={bild.height}
      sizes={sizes}
      priority={priority}
      {...(wichtig ? { preload: true, fetchPriority: "high" as const } : {})}
      basePath={basePath || undefined}
      placeholder="empty"
      className={className}
      style={style}
    />
  );
}

export default function BlogBild({ bild }: { bild: ArtikelBild }) {
  return (
    <figure className="my-10">
      <BlogBildRoh bild={bild} sizes="(min-width: 768px) 584px, calc(100vw - 2rem)" className="h-auto max-h-[620px] w-full rounded-2xl object-cover shadow-sm" />
      <figcaption className="mt-3 text-center text-sm text-muted">{bild.alt}</figcaption>
    </figure>
  );
}
