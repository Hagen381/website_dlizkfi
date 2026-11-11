import type { Metadata } from "next";
import PlattformLogo from "@/components/PlattformLogo";
import StartseiteFolgen from "@/components/StartseiteFolgen";
import { heroZeilen } from "@/lib/startseite";
import { plattformen, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  alternates: { canonical: "/" },
};

export default function Startseite() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-10 pb-20 text-center sm:pt-16 lg:pb-28">
        <p className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">{siteConfig.moderation}</p>
        <h1 className="text-4xl leading-none font-bold tracking-tight text-balance lg:text-6xl lg:tracking-[-1.5px]">{siteConfig.name}</h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          {heroZeilen.map((z, i) => (
            <span key={i}>
              {z}
              {i < heroZeilen.length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="mt-10">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Anhören auf</p>
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {plattformen.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener" aria-label={p.name} title={p.name} className="kipp kipp-dezent flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 hover:bg-surface">
                  <PlattformLogo p={p} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <StartseiteFolgen />
    </>
  );
}
