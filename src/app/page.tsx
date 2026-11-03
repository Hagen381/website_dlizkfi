import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  alternates: { canonical: "/" },
};

export default function Startseite() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <p className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">{siteConfig.moderation}</p>
      <h1 className="text-4xl font-bold tracking-tight text-balance lg:text-6xl">{siteConfig.name}</h1>
      <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted">{siteConfig.tagline}</p>
    </section>
  );
}
