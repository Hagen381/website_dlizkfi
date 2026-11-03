"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Cover from "@/components/Cover";
import { abonnieren, navigation, siteConfig } from "@/lib/site-config";

// Aktiv auch auf Unterseiten: /episodes/<slug>/ und /episodes/page/2/ → „Folgen".
function istAktiv(pathname: string, href: string) {
  const p = pathname.replace(/\/+$/, "");
  const h = href.replace(/\/+$/, "");
  return p === h || p.startsWith(`${h}/`);
}

// „Gescrollt?" als externer Zustand (kein setState im Effect): steuert die
// feine Linie unter dem klebenden Header.
function aufScroll(melden: () => void) {
  window.addEventListener("scroll", melden, { passive: true });
  return () => window.removeEventListener("scroll", melden);
}
const istGescrollt = () => window.scrollY > 4;
const nieGescrollt = () => false;

const KopfhoererIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 18v-6a9 9 0 0 1 18 0v6"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5Z"
    />
  </svg>
);

// Header (bewusste Abweichung vom PodView-Original, ausdrücklicher Auftrag):
// größeres Cover mit Schriftzug, Menüpunkte als Flächen, „Abonnieren" als
// gelber Button, klebt beim Scrollen oben. Unter 1024 px ersetzt ein
// „☰ Menü"-Knopf die Links und öffnet ein Menü von oben.
export default function Header({ blog = false }: { blog?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [offen, setOffen] = useState(false);
  const gescrollt = useSyncExternalStore(aufScroll, istGescrollt, nieGescrollt);
  const knopf = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Blog erscheint erst in der Navigation, wenn es Artikel gibt — dann
  // zwischen „Folgen" und „Über".
  const punkte = blog
    ? [navigation[0], { label: "Blog", href: "/blog/" }, ...navigation.slice(1)]
    : [...navigation];
  const abonnierenAktiv = istAktiv(pathname, abonnieren.href);

  useEffect(() => {
    if (!offen) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const p = panel.current;
    p?.querySelector<HTMLElement>("a,button")?.focus();
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOffen(false);
        return;
      }
      // Fokus bleibt im Menü (Tab / Shift+Tab laufen im Kreis).
      if (e.key === "Tab" && p) {
        const ziele = [...p.querySelectorAll<HTMLElement>("a[href],button")];
        if (!ziele.length) return;
        const erstes = ziele[0];
        const letztes = ziele[ziele.length - 1];
        if (e.shiftKey && document.activeElement === erstes) {
          e.preventDefault();
          letztes.focus();
        } else if (!e.shiftKey && document.activeElement === letztes) {
          e.preventDefault();
          erstes.focus();
        }
      }
    };
    window.addEventListener("keydown", taste);
    const k = knopf.current;
    return () => {
      document.body.style.overflow = vorher;
      window.removeEventListener("keydown", taste);
      k?.focus();
    };
  }, [offen]);

  const marke = (
    <Link
      href="/"
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg"
      aria-label={`${siteConfig.name} – Startseite`}
    >
      <Cover
        groesse={44}
        sizes="44px"
        className="h-11 w-11 shrink-0 rounded-md shadow-sm"
        priority
      />
      <span className="min-w-0 leading-tight">
        <span className="block font-heading text-lg font-bold tracking-tight text-text">
          {siteConfig.kurzname}
        </span>
        <span className="hidden truncate text-xs text-muted sm:block">
          Das Leben ist zu kurz für irgendwann
        </span>
      </span>
    </Link>
  );

  return (
    <header
      className={`sticky top-[env(safe-area-inset-top)] z-50 border-b bg-bg/85 backdrop-blur-md transition-colors supports-[not(backdrop-filter:blur(1px))]:bg-bg ${
        gescrollt ? "border-border" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {marke}

        <nav
          aria-label="Hauptnavigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {punkte.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={istAktiv(pathname, item.href) ? "page" : undefined}
              className="flex min-h-11 items-center rounded-lg px-4 font-heading text-base font-semibold whitespace-nowrap text-text transition hover:bg-primary/20 aria-[current=page]:bg-primary aria-[current=page]:text-text"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={abonnieren.href}
            aria-current={abonnierenAktiv ? "page" : undefined}
            className="ml-3 flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-heading text-base font-bold whitespace-nowrap text-text shadow-sm ring-text/80 transition hover:shadow-md hover:brightness-105 aria-[current=page]:ring-2"
          >
            <KopfhoererIcon />
            {abonnieren.label}
          </Link>
        </nav>

        <button
          ref={knopf}
          type="button"
          className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 font-heading text-base font-semibold text-text transition hover:bg-primary/20 lg:hidden"
          aria-expanded={offen}
          aria-controls="menue-panel"
          aria-haspopup="dialog"
          onClick={() => setOffen(true)}
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
          Menü
        </button>
      </div>

      {/* Per Portal direkt in <body>: Der Header hat backdrop-filter und wäre
          sonst der Bezugsrahmen für position:fixed — der Hintergrund des Menüs
          bedeckte dann nur den Header, Tippen außerhalb ginge ins Leere. */}
      {offen &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Tippen außerhalb schließt */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-label="Menü schließen"
              tabIndex={-1}
              onClick={() => setOffen(false)}
            />
            <div
              ref={panel}
              id="menue-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col overflow-y-auto rounded-b-2xl border-b border-border bg-bg pt-[env(safe-area-inset-top)] text-text shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                {marke}
                <button
                  type="button"
                  className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 font-heading text-base font-semibold text-text transition hover:bg-primary/20"
                  aria-label="Menü schließen"
                  onClick={() => setOffen(false)}
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                  <span aria-hidden="true">Schließen</span>
                </button>
              </div>
              <nav
                aria-label="Hauptnavigation mobil"
                className="flex flex-col gap-1 px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6"
              >
                {punkte.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={
                      istAktiv(pathname, item.href) ? "page" : undefined
                    }
                    className="flex min-h-12 items-center rounded-xl px-4 font-heading text-xl font-semibold text-text transition hover:bg-primary/20 aria-[current=page]:bg-primary"
                    onClick={() => setOffen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href={abonnieren.href}
                  aria-current={abonnierenAktiv ? "page" : undefined}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-heading text-xl font-bold text-text shadow-sm ring-text/80 transition hover:brightness-105 aria-[current=page]:ring-2"
                  onClick={() => setOffen(false)}
                >
                  <KopfhoererIcon className="h-6 w-6" />
                  {abonnieren.label}
                </Link>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
