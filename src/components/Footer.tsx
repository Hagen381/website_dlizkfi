import Link from "next/link";
import Cover from "@/components/Cover";
import PlattformLogo from "@/components/PlattformLogo";
import { footerNavigation, plattformen, siteConfig } from "@/lib/site-config";

// Fusszeile wie auf der Live-Seite, aber ohne "Erstellt mit PodView" und
// ohne den PodSEO-Werbelink. Dafür Impressum + Datenschutz.
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="inline-flex min-h-11 items-center" aria-label="Startseite">
              <Cover groesse={40} sizes="40px" className="h-10 w-10 rounded-sm" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {siteConfig.tagline} Kennst du diesen Gedanken: Irgendwann …
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase">Anhören</h2>
            <nav aria-label="Fusszeile" className="mt-2 grid grid-cols-2 gap-x-6 md:grid-cols-1">
              {footerNavigation.map((item) => (
                <Link key={item.href} href={item.href} className="flex min-h-11 items-center text-sm text-muted transition hover:text-text md:min-h-7">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase">Abonnieren</h2>
            <ul className="mt-2 grid grid-cols-1 gap-2">
              {plattformen.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener" className="kipp kipp-dezent inline-flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-bg px-3 text-sm text-muted hover:text-text md:min-h-9">
                    <PlattformLogo p={p} groesse={16} />
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-x-3 gap-y-1 border-t border-border pt-6 text-center text-xs text-muted sm:flex-row">
          <span>© {siteConfig.name}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <Link href="/impressum/" className="inline-flex min-h-11 items-center hover:text-text">Impressum</Link>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <Link href="/privacy/" className="inline-flex min-h-11 items-center hover:text-text">Datenschutzerklärung</Link>
        </div>
      </div>
    </footer>
  );
}
