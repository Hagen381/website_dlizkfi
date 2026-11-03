import type { Metadata } from "next";
import Link from "next/link";
import { artikel } from "@/lib/blog";
import { folgeNachSlug } from "@/lib/folgen";
import { breadcrumb, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog",
  description: "Artikel zu den Folgen von „Das Leben ist zu kurz für irgendwann“.",
  alternates: { canonical: "/blog/" },
};

// Solange es keine Artikel gibt, ist /blog/ weder in der Navigation noch in
// der Sitemap verlinkt (siehe hatBlog in src/lib/blog.ts).
export default function Blog() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8 sm:pt-10">
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Blog", pfad: "/blog/" }])] }} />
      <h1 className="text-3xl font-bold">Blog</h1>
      {artikel.length === 0 ? (
        <p className="mt-6 text-muted">Hier erscheinen bald Artikel zu den Folgen.</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {artikel.map((a) => {
            const folge = a.folgeSlug ? folgeNachSlug(a.folgeSlug) : null;
            return (
              <li key={a.slug}>
                <article className="relative h-full rounded-lg border border-border bg-surface p-6 shadow-xs transition hover:shadow-md">
                  <p className="text-sm text-muted">
                    <time dateTime={a.datum}>{new Date(a.datum).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</time>
                    {folge && <> · zur Folge „{folge.titel}“</>}
                  </p>
                  <h2 className="mt-2 font-heading text-lg font-semibold">
                    <Link href={`/blog/${a.slug}/`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
                      {a.titel}
                    </Link>
                  </h2>
                  <p className="mt-2 text-muted">{a.beschreibung}</p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
