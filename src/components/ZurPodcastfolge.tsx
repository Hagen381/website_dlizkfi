import GelberButton from "@/components/GelberButton";
import { Kopfhoerer } from "@/components/Icons";

// Button „Zur Podcastfolge" in Blogartikeln (oben unter dem Lead und im
// Kasten „Zur Folge"). Ziel ist immer unsere eigene Folgenseite, nie Spotify.
export default function ZurPodcastfolge({ folgeSlug, className = "" }: { folgeSlug: string; className?: string }) {
  return (
    <GelberButton href={`/episodes/${folgeSlug}/`} icon={<Kopfhoerer className="h-5 w-5" />} className={className}>
      Zur Podcastfolge
    </GelberButton>
  );
}
