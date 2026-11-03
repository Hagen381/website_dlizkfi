// Sichtbare Lücke für Angaben, die noch fehlen. Nichts erfinden.
// data-platzhalter: Die Live-Sicherheitsprüfung (deploy-allinkl.yml) bricht ab,
// wenn diese Markierung im Export steht — Platzhalter gehen nie live.
export default function Platzhalter({ children }: { children: React.ReactNode }) {
  return <span data-platzhalter="" className="rounded bg-primary/20 px-1.5 font-medium">[{children}]</span>;
}
