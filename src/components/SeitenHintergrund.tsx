// Gemeinsamer Seitenhintergrund: drei weiche Farbflecken (primary/secondary),
// fix hinter dem Inhalt aller Seiten. Stile: .seiten-hintergrund in globals.css.
export default function SeitenHintergrund() {
  return (
    <div className="seiten-hintergrund" aria-hidden="true">
      <div className="seiten-fleck seiten-fleck-1" />
      <div className="seiten-fleck seiten-fleck-2" />
      <div className="seiten-fleck seiten-fleck-3" />
    </div>
  );
}
