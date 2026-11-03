import { MAIL_PLATZHALTER, siteConfig } from "@/lib/site-config";

// Zeigt die Kontakt-Mailadresse aus site-config — oder sichtbar den
// Platzhalter, solange sie noch nicht feststeht.
export default function Mailadresse({ className = "" }: { className?: string }) {
  const mail = siteConfig.kontaktEmail;
  if (!mail) return <span className={`rounded bg-primary/20 px-1.5 font-medium ${className}`}>{MAIL_PLATZHALTER}</span>;
  return (
    <a href={`mailto:${mail}`} className={`font-medium text-secondary-text underline underline-offset-2 ${className}`}>
      {mail}
    </a>
  );
}
