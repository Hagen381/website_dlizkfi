// Sichtbare Lücke für Angaben, die noch fehlen. Nichts erfinden.
export default function Platzhalter({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-primary/20 px-1.5 font-medium">[{children}]</span>;
}
