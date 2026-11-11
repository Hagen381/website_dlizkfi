import type { Metadata } from "next";
import BlogKarte from "@/components/BlogKarte";
import { artikel } from "@/lib/blog";
import { breadcrumb, JsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Blog",
  description: `Artikel zu den Folgen von „${siteConfig.name}“: Auswandern, Familie und das Leben auf Koh Samui.`,
  alternates: { canonical: "/blog/" },
};

// Neueste zuerst. Solange es keine veröffentlichten Artikel gibt, ist /blog/
// weder in der Navigation noch in der Sitemap (hatBlog in src/lib/blog.ts).
export default function Blog() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8 sm:pt-10">
      <JsonLd daten={{ "@graph": [breadcrumb([{ name: "Blog", pfad: "/blog/" }])] }} />
      <h1 className="text-3xl font-bold">Blog</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Geschichten und Gedanken zu den Folgen – zum Lesen statt Hören.</p>
      {artikel.length === 0 ? (
        <p className="mt-8 text-muted">Hier erscheinen bald Artikel zu den Folgen.</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artikel.map((a, i) => (
            <li key={a.slug} className="karte-ein" style={{ ["--nr" as string]: i }}>
              <BlogKarte a={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
