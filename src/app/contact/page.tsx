import type { Metadata } from "next";
import { Mail } from "@/components/Icons";
import Mailadresse from "@/components/Mailadresse";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Kontakt zu ${siteConfig.name}: Fragen, Feedback oder einfach Hallo sagen.`,
  alternates: { canonical: "/contact/" },
};

// Bewusst KEIN Formular (statische Seite, keine Datenverarbeitung) — nur die
// Mailadresse aus site-config.
export default function Kontakt() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Kontakt", pfad: "/contact/" }])] }} />
      <section className="rounded-lg border border-border bg-surface p-6 shadow-xs sm:p-8">
        <h1 className="text-3xl font-bold">Kontakt</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Hast du eine Frage, Feedback oder möchtest du einfach Hallo sagen? Schick eine Nachricht – sie geht direkt an {siteConfig.name}.
        </p>
        <div className="mt-8 flex items-start gap-4 rounded-lg border border-border bg-bg p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-text">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">E-Mail</p>
            <p className="mt-1 text-lg [overflow-wrap:anywhere]">
              <Mailadresse />
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
