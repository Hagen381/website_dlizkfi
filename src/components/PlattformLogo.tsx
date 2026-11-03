import { mitBasePath } from "@/lib/base-path";
import type { Plattform } from "@/lib/site-config";

// Plattform-Logos liegen lokal unter public/plattformen/ (einmalig von der
// Live-Seite gesichert). Kleine SVG/PNG -> schlichtes <img>.
export default function PlattformLogo({ p, groesse = 20, className = "" }: { p: Plattform; groesse?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mitBasePath(p.logo)} alt="" width={groesse} height={groesse} loading="lazy" decoding="async" className={`shrink-0 rounded ${className}`} />
  );
}
