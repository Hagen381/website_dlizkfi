import Link from "next/link";
import { Kopfhoerer } from "@/components/Icons";

// Button „Zur Podcastfolge" in Blogartikeln (oben unter dem Lead und im
// Kasten „Zur Folge"). Ziel ist immer unsere eigene Folgenseite, nie Spotify.
// Stil wie „Abonnieren" im Header: gelbe Pille, dunkler Text (Kontrast > 4,5:1),
// mind. 44 px hoch.
export default function ZurPodcastfolge({ folgeSlug, className = "" }: { folgeSlug: string; className?: string }) {
  return (
    <Link
      href={`/episodes/${folgeSlug}/`}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 font-heading text-base font-bold text-text shadow-sm transition hover:shadow-md hover:brightness-105 ${className}`}
    >
      <Kopfhoerer className="h-5 w-5" />
      Zur Podcastfolge
    </Link>
  );
}
