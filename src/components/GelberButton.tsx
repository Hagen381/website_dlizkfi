import Link from "next/link";
import type { ReactNode } from "react";

// Gelber Link-Button im Stil von „Abonnieren" (Header): gelbe Pille, dunkler
// Text (Kontrast > 4,5:1), mind. 44 px hoch. Für „Zur Podcastfolge" im Blog
// und „Zum Blogartikel" auf der Folgenseite.
export default function GelberButton({ href, icon, children, className = "" }: { href: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 font-heading text-base font-bold text-text shadow-sm transition hover:shadow-md hover:brightness-105 ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}
