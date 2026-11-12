import Link from "next/link";
import type { Thema } from "@/lib/themen";

// Themen einer Folge als kleine Chips (Folgenseite, Blogartikel), jeweils Link
// auf die gefilterte Übersicht /episodes/?thema=<key>. Dezent und unterhalb
// des Inhalts, nie über dem Player. Die Trefferfläche ist 44 px hoch, der
// sichtbare Chip kleiner. Kein 3D (wie Textlinks).
export default function ThemenChips({ themen, className = "" }: { themen: Thema[]; className?: string }) {
  if (!themen.length) return null;
  return (
    <nav aria-label="Themen dieser Folge" className={className}>
      <ul className="flex flex-wrap items-center gap-x-1.5">
        <li className="mr-1 text-sm text-muted" aria-hidden="true">
          Themen:
        </li>
        {themen.map((t) => (
          <li key={t.key}>
            <Link href={`/episodes/?thema=${t.key}`} className="group inline-flex min-h-11 items-center rounded-full focus-visible:outline-offset-0">
              <span className="rounded-full border border-border bg-bg/70 px-3 py-1 text-sm leading-tight text-text transition-colors group-hover:border-primary group-hover:bg-primary/25">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
