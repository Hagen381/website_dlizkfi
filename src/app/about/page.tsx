import type { Metadata } from "next";
import Cover from "@/components/Cover";
import PlattformLogo from "@/components/PlattformLogo";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { plattform, plattformen, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Über",
  description: siteConfig.description,
  alternates: { canonical: "/about/" },
};

// Text wörtlich von https://www.daslebenistzukurzfuerirgendwann.de/about/
// (docs/original/text/about.txt).
export default function Ueber() {
  return (
    <div className="mx-auto max-w-[52rem] px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Über", pfad: "/about/" }])] }} />
      <article className="rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Cover groesse={192} sizes="192px" className="h-40 w-40 shrink-0 rounded-lg shadow-sm sm:h-48 sm:w-48" priority />
          <div>
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">Über {siteConfig.name}</h1>
            <p className="mt-3 text-lg text-muted">Moderiert von {siteConfig.moderation}</p>
          </div>
        </header>
        <div className="prosa mt-8 text-base leading-[1.75] sm:text-[1.0625rem]">
          <p>{siteConfig.tagline}</p>
          <p>Kennst du diesen Gedanken: Irgendwann mache ich das auch mal?</p>
          <p>
            Irgendwann reisen.
            <br />
            Irgendwann auswandern.
            <br />
            Irgendwann etwas Neues anfangen.
            <br />
            Irgendwann mutiger sein.
            <br />
            Irgendwann mehr nach dem eigenen Bauchgefühl leben.
          </p>
          <p>Genau darum geht es in meinem Podcast „Das Leben ist zu kurz für irgendwann“.</p>
          <p>
            Ich nehme dich mit auf unseren Weg als Familie raus aus Deutschland und rein in ein neues Leben in Thailand. Aber hier geht es nicht nur um Palmen, Meer und Auswandern. Es
            geht auch um all das, was vorher passiert: Zweifel, Bürokratie, Schulpflicht, Online-Business, Visum, Krankenversicherung, Haushaltsauflösung, große Träume, kleine
            Nervenzusammenbrüche und diese Frage, die immer wieder auftaucht: Machen wir das wirklich?
          </p>
          <p>
            Ich erzähle ehrlich, locker und ohne Hochglanzfilter von unserem Alltag, unseren Entscheidungen, Umwegen und Aha-Momenten.
            <br />
            Dieser Podcast ist für dich, wenn du auch manchmal spürst, dass da noch mehr gehen könnte. Wenn du einen Traum hast, den du ständig auf später verschiebst. Oder wenn du
            einfach neugierig bist, wie es wirklich ist, als Familie ein neues Leben zu starten.
          </p>
          <p>Du findest den Podcast auch auf allen gängigen Plattformen (siehe unten) und auf YouTube.</p>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Links</h2>
        <p className="mt-3">
          <a href={plattform("youtube").url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center text-secondary-text underline underline-offset-2 [overflow-wrap:anywhere]">
            {plattform("youtube").url}
          </a>
        </p>

        <h2 className="mt-8 text-xl font-semibold">Anhören auf</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {plattformen.map((p) => (
            <li key={p.id}>
              <a href={p.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-border/70 px-4 text-[1.0625rem] transition hover:bg-border">
                <PlattformLogo p={p} groesse={18} />
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
