// Sichtbarer Entwurf-Hinweis. Trägt data-platzhalter: Die Live-Sicherheitsprüfung
// bricht ab, solange er im Export steht.
export default function EntwurfHinweis({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" data-platzhalter="" className="!mb-8 rounded-lg border-2 border-secondary bg-secondary/10 px-4 py-3 font-semibold text-text">
      {children}
    </p>
  );
}
