import MailLink from "@/components/MailLink";
import { MAIL_PLATZHALTER, siteConfig } from "@/lib/site-config";

// Zeigt die Kontakt-Mailadresse aus site-config (mit leichtem Spam-Schutz,
// siehe MailLink) — oder sichtbar den Platzhalter, solange keine feststeht.
export default function Mailadresse({ className = "" }: { className?: string }) {
  const mail = siteConfig.kontaktEmail;
  if (!mail) return <span className={`rounded bg-primary/20 px-1.5 font-medium ${className}`}>{MAIL_PLATZHALTER}</span>;
  return <MailLink name={mail.name} domain={mail.domain} className={className} />;
}
