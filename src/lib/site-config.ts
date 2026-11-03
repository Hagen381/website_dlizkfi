// Zentrale Angaben der Website. Domain, Mailadresse, Feed und Plattform-Links
// stehen NUR hier — alle Seiten, Metadaten, JSON-LD, Sitemap und robots.txt
// lesen daraus.

export const siteConfig = {
  // Live-Domain (mit www). Steht absichtlich nur an dieser einen Stelle.
  url: "https://www.daslebenistzukurzfuerirgendwann.de",
  name: "Das Leben ist zu kurz für irgendwann - Podcast",
  kurzname: "DLIZKFI",
  // Wie auf der Live-Seite ("Moderiert von Juliette", Kicker über dem Titel).
  moderation: "Juliette",
  // Untertitel und Beschreibung wörtlich von der Live-Seite übernommen.
  tagline:
    "Raus aus dem Irgendwann: Mein ehrlicher Podcast über Auswandern, Familie und den Mut, wirklich loszugehen",
  description:
    "Raus aus dem Irgendwann: Mein ehrlicher Podcast über Auswandern, Familie und den Mut, wirklich loszugehen. Kennst du diesen Gedanken: Irgendwann mache ich das auch mal?",
  sprache: "de-DE",
  feed: "https://anchor.fm/s/104754158/podcast/rss",
  // Kontakt-Mailadresse — bewusst in zwei Teilen: So steht sie nirgends im
  // Export (HTML, JS, RSC) als zusammenhängende Zeichenkette (leichter Schutz
  // vor Adress-Sammlern). Angezeigt und verlinkt wird sie über
  // src/components/Mailadresse.tsx. Kontaktseite, Impressum und Datenschutz
  // lesen nur von hier. Mit null erscheint sichtbar "[Mailadresse folgt]".
  kontaktEmail: { name: "dlizkfipodcast", domain: "gmail.com" } as { name: string; domain: string } | null,
  // Verantwortliche Person für Impressum (§ 5 DDG, § 18 Abs. 2 MStV) und
  // Datenschutzerklärung. Nur hier pflegen.
  verantwortlich: {
    name: "Juliette Oppel",
    anschrift: ["89/8 Moo 6, Bang Por Soi 3", "Mae Nam Subdistrict", "Koh Samui District", "Surat Thani Province 84330", "Thailand"],
  },
  // Folgen pro Seite auf /episodes/ (wie bei PodView).
  folgenProSeite: 12,
} as const;

export const MAIL_PLATZHALTER = "[Mailadresse folgt]";

export type Plattform = {
  id: "spotify" | "apple" | "youtube";
  name: string;
  url: string;
  logo: string; // Pfad unter public/ (selbst gehostet, offizielle Logos unverändert)
};

// DIE Plattform-Liste — einzige Stelle. Hero, Folgenseiten, Fusszeile,
// /follow/, /about/ und JSON-LD (sameAs) lesen nur von hier. Reihenfolge =
// Anzeigereihenfolge. (Andere Apps erreichen den Podcast über den RSS-Feed
// auf /follow/.)
export const plattformen: Plattform[] = [
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com/show/0m7DHiEhXuUZJPDkmtmWb0", logo: "/plattformen/spotify.svg" },
  { id: "apple", name: "Apple Podcasts", url: "https://podcasts.apple.com/podcast/id1821004400", logo: "/plattformen/apple.svg" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/@DLIZKFIPodcast", logo: "/plattformen/youtube.svg" },
];

export const plattform = (id: Plattform["id"]) => plattformen.find((p) => p.id === id)!;

// Hauptnavigation (Header). „Blog" reiht sich automatisch nach „Folgen" ein,
// sobald es Artikel gibt (src/lib/blog.ts → hatBlog).
export const navigation = [
  { label: "Folgen", href: "/episodes/" },
  { label: "Über", href: "/about/" },
  { label: "Kontakt", href: "/contact/" },
] as const;

// Stärkster Punkt im Header: als gelber Button gerendert.
export const abonnieren = { label: "Abonnieren", href: "/follow/" } as const;

export const footerNavigation = [
  { label: "Startseite", href: "/" },
  { label: "Folgen", href: "/episodes/" },
  { label: "Über", href: "/about/" },
  { label: "Abonnieren", href: "/follow/" },
] as const;

// Feste Seiten für die Sitemap. Folgen, Blätterseiten und Blogartikel
// ergänzt src/app/sitemap.ts automatisch.
export const sitePages: {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/episodes/", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about/", changeFrequency: "monthly", priority: 0.5 },
  { path: "/follow/", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact/", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy/", changeFrequency: "yearly", priority: 0.1 },
  { path: "/impressum/", changeFrequency: "yearly", priority: 0.1 },
];
