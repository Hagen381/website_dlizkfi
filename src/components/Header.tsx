"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ExportedImage from "next-image-export-optimizer";
import cover from "@/assets/images/cover.jpg";
import { navigation, siteConfig } from "@/lib/site-config";

function istAktiv(pathname: string, href: string) {
  const p = pathname.replace(/\/+$/, "");
  const h = href.replace(/\/+$/, "");
  return p === h || p.startsWith(`${h}/`);
}

// Nachbau der PodView-Navigation: Logo links, Textlinks rechts. Unter 768px
// ersetzt ein Drei-Punkte-Knopf (44×44) die Links und öffnet ein Menü, das
// wie im Original von unten hereinfährt (ab md: von rechts).
export default function Header() {
  const pathname = usePathname() ?? "/";
  const [offen, setOffen] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    window.addEventListener("keydown", taste);
    const k = knopf.current;
    return () => {
      document.body.style.overflow = vorher;
      window.removeEventListener("keydown", taste);
      k?.focus();
    };
  }, [offen]);

  return (
    <header className="bg-bg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="flex min-h-11 items-center" aria-label={`${siteConfig.name} – Startseite`}>
          <ExportedImage src={cover} alt="" width={32} height={32} sizes="32px" className="h-8 w-8 rounded-sm object-cover" priority />
        </Link>
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={istAktiv(pathname, item.href) ? "page" : undefined}
              className="flex min-h-11 items-center text-sm whitespace-nowrap text-muted transition hover:text-text aria-[current=page]:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          ref={knopf}
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-border/50 hover:text-text md:hidden"
          aria-expanded={offen}
          aria-controls="menue-panel"
          aria-haspopup="dialog"
          onClick={() => setOffen(true)}
        >
          <span className="sr-only">Menü öffnen</span>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </button>
      </div>

      {offen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Menü schließen" tabIndex={-1} onClick={() => setOffen(false)} />
          <div
            ref={panel}
            id="menue-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface text-text shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <span className="min-w-0 truncate font-heading text-base font-bold text-primary-text">{siteConfig.name}</span>
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-border/50 hover:text-text" aria-label="Menü schließen" onClick={() => setOffen(false)}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav aria-label="Hauptnavigation mobil" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={istAktiv(pathname, item.href) ? "page" : undefined}
                  className="flex min-h-11 items-center rounded-lg px-4 py-3 text-base font-medium text-text transition hover:bg-border/50 aria-[current=page]:bg-border/60"
                  onClick={() => setOffen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
