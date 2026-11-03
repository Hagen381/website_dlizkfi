// Rahmen für Rechtstexte und Blogartikel: Karte im Seitenstil, Fliesstext.
export default function Textseite({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[52rem] px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <article className="prosa rounded-lg border border-border bg-surface p-5 leading-relaxed shadow-xs [overflow-wrap:anywhere] sm:p-8 [&_h1]:mb-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:hyphens-auto [&_h1]:[overflow-wrap:normal] sm:[&_h1]:text-3xl">
        {children}
      </article>
    </div>
  );
}
