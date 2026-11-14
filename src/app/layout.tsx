import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KippSteuerung from "@/components/KippSteuerung";
import SeitenHintergrund from "@/components/SeitenHintergrund";
import { hatBlog } from "@/lib/blog";
import { istVorschau } from "@/lib/base-path";
import { JsonLd, serieId } from "@/lib/seo";
import { plattformen, siteConfig } from "@/lib/site-config";
import "./globals.css";

// Schriften selbst gehostet (SIL Open Font License, Lizenztexte in src/fonts/).
// Kein Google Fonts: beim Laden geht keine Anfrage an fremde Server.
const bricolage = localFont({
  variable: "--font-bricolage",
  display: "swap",
  src: [
    { path: "../fonts/bricolage-grotesque-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/bricolage-grotesque-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/bricolage-grotesque-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const literata = localFont({
  variable: "--font-literata",
  display: "swap",
  src: [
    { path: "../fonts/literata-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/literata-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/literata-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/literata-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // Vorschau (GitHub Pages) darf nie in den Index: noindex auf jeder Seite.
  robots: istVorschau ? { index: false, follow: false } : { index: true, follow: true },
  alternates: {
    types: { "application/rss+xml": [{ url: siteConfig.feed, title: siteConfig.name }] },
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: "/images/og-cover.jpg", width: 1200, height: 1200, alt: siteConfig.name }],
  },
  twitter: { card: "summary", title: siteConfig.name, description: siteConfig.description, images: ["/images/og-cover.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#fefce8",
  colorScheme: "light",
};

const serie = {
  "@type": "PodcastSeries",
  "@id": serieId,
  name: siteConfig.name,
  description: siteConfig.description,
  url: `${siteConfig.url}/`,
  inLanguage: siteConfig.sprache,
  image: `${siteConfig.url}/images/og-cover.jpg`,
  webFeed: siteConfig.feed,
  author: { "@type": "Person", name: siteConfig.moderation },
  sameAs: plattformen.map((p) => p.url),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${bricolage.variable} ${literata.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded focus:bg-surface focus:px-4 focus:py-3">
          Zum Inhalt springen
        </a>
        <JsonLd daten={serie} />
        <SeitenHintergrund />
        <Header blog={hatBlog} />
        <main id="inhalt" className="flex-1">
          {children}
        </main>
        <Footer />
        <KippSteuerung />
      </body>
    </html>
  );
}
