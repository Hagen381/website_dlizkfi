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
  // Kontakt-Mailadresse ist noch offen. Solange hier null steht, zeigen
  // Kontaktseite, Impressum und Datenschutz sichtbar "[Mailadresse folgt]".
  kontaktEmail: null as string | null,
  youtube: "https://www.youtube.com/@DLIZKFIPodcast",
  // Folgen pro Seite auf /episodes/ (wie bei PodView).
  folgenProSeite: 12,
} as const;

export const MAIL_PLATZHALTER = "[Mailadresse folgt]";

export type Plattform = {
  id: string;
  name: string;
  url: string;
  logo: string; // Pfad unter public/
  // Erscheint in der "Anhören auf"-Zeile im Hero und in der Fusszeile
  // (auf der Live-Seite dieselben sechs).
  kurzliste?: boolean;
};

// Reihenfolge und Adressen 1:1 von https://www.daslebenistzukurzfuerirgendwann.de/follow/
// (siehe docs/original/stile/follow-1280.json).
export const plattformen: Plattform[] = [
  { id: "apple", name: "Apple Podcasts", url: "https://podcasts.apple.com/podcast/id1821004400", logo: "/plattformen/apple.svg", kurzliste: true },
  { id: "castbox", name: "Castbox", url: "https://castbox.fm/vic/1821004400", logo: "/plattformen/castbox.svg", kurzliste: true },
  { id: "castro", name: "Castro", url: "https://castro.fm/itunes/1821004400", logo: "/plattformen/castro.svg", kurzliste: true },
  { id: "goodpods", name: "Goodpods", url: "https://www.goodpods.com/podcasts-aid/1821004400", logo: "/plattformen/goodpods.svg", kurzliste: true },
  { id: "moonfm", name: "Moon FM", url: "https://moon.fm/itunes/1821004400", logo: "/plattformen/moonfm.svg", kurzliste: true },
  { id: "overcast", name: "Overcast", url: "https://overcast.fm/itunes1821004400", logo: "/plattformen/overcast.svg", kurzliste: true },
  { id: "pocketcasts", name: "Pocket Casts", url: "https://pca.st/itunes/1821004400", logo: "/plattformen/pocketcasts.svg" },
  { id: "podbean", name: "Podbean", url: "https://www.podbean.com/itunes/1821004400", logo: "/plattformen/podbean.png" },
  { id: "podcastaddict", name: "Podcast Addict", url: "https://podcastaddict.com/feed/https%3A%2F%2Fanchor.fm%2Fs%2F104754158%2Fpodcast%2Frss", logo: "/plattformen/podcastaddict.svg" },
  { id: "podcastrepublic", name: "Podcast Republic", url: "https://www.podcastrepublic.net/podcast/1821004400", logo: "/plattformen/podcastrepublic.svg" },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com/show/0m7DHiEhXuUZJPDkmtmWb0", logo: "/plattformen/spotify.svg" },
];

export const navigation = [
  { label: "Folgen", href: "/episodes/" },
  { label: "Über", href: "/about/" },
  { label: "Kontakt", href: "/contact/" },
  { label: "Abonnieren", href: "/follow/" },
] as const;

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
