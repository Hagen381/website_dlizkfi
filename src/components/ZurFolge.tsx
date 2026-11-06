import Link from "next/link";
import Cover from "@/components/Cover";
import Player from "@/components/Player";
import ZurPodcastfolge from "@/components/ZurPodcastfolge";
import { datumKurz, dauerGesprochen, dauerText, type Folge } from "@/lib/folgen";

// Kasten „Zur Folge" unter einem Blogartikel: Cover, Titel, Player
// (preload="none" — lädt erst beim Abspielen) und Button „Zur Podcastfolge" (Folgenseite).
export default function ZurFolge({ folge }: { folge: Folge }) {
  return (
    <aside aria-labelledby="zur-folge" className="mt-14 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      <p id="zur-folge" className="font-heading text-sm font-semibold tracking-wider text-muted uppercase">
        Zur Folge
      </p>
      <div className="mt-4 flex items-start gap-4">
        <Cover groesse={96} sizes="96px" className="h-20 w-20 shrink-0 rounded-xl shadow-sm sm:h-24 sm:w-24" />
        <div className="min-w-0">
          <p className="font-heading text-lg leading-snug font-bold text-balance [overflow-wrap:anywhere] sm:text-xl">
            <Link href={`/episodes/${folge.slug}/`} className="hover:underline">
              {folge.titel}
            </Link>
          </p>
          <p className="mt-1 text-sm text-muted">
            <time dateTime={folge.datum}>{datumKurz(folge.datum)}</time>
            {folge.dauer != null && (
              <>
                <span aria-hidden="true"> · {dauerText(folge.dauer)}</span>
                <span className="sr-only">, Dauer {dauerGesprochen(folge.dauer)}</span>
              </>
            )}
          </p>
        </div>
      </div>
      {folge.mp3 && (
        <div className="mt-5">
          <Player src={folge.mp3} titel={folge.titel} dauer={folge.dauer} />
        </div>
      )}
      <ZurPodcastfolge folgeSlug={folge.slug} className="mt-6" />
    </aside>
  );
}
