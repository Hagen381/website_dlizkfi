import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  robots: { index: false, follow: true },
};

export default function NichtGefunden() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-widest text-muted uppercase">Fehler 404</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">Seite nicht gefunden</h1>
      <p className="mt-6 text-lg text-muted">Diese Seite gibt es nicht (mehr). Vielleicht findest du, was du suchst, bei den Folgen.</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/episodes/" className="inline-flex min-h-12 items-center rounded-full bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-text shadow-sm transition hover:opacity-90">
          Alle Folgen ansehen
        </Link>
        <Link href="/" className="inline-flex min-h-12 items-center px-2 font-medium text-text hover:underline">
          Zur Startseite
        </Link>
      </div>
    </section>
  );
}
