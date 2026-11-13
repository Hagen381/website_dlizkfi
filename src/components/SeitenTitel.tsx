import Cover from "@/components/Cover";

// Seitenüberschrift im DLIZKFI-Stil (/blog/ „DLIZKFI – Blog“, /episodes/
// „DLIZKFI – Podcast“): links das Podcast-Cover als kleines Logo (Deko,
// aria-hidden), „DLIZKFI“ als Wortmarke mit gelber Unterstreichung, danach
// „– <zusatz>“. „DLIZKFI –“ bricht nie auseinander (nowrap), umgebrochen wird
// höchstens vor dem Zusatz. Stile und die einmalige Animation beim Laden
// (Logo federt herein, Unterstreichung zieht auf, Text blendet kurz ein —
// nur transform/opacity, < 900 ms, ohne bei prefers-reduced-motion):
// .seiten-titel in globals.css. textContent des H1 = „DLIZKFI – <zusatz>“.
export default function SeitenTitel({ zusatz, className = "" }: { zusatz: string; className?: string }) {
  return (
    <h1 className={`seiten-titel ${className}`}>
      <span className="st-logo kipp kipp-dezent" aria-hidden="true">
        <span className="st-logo-innen">
          <Cover groesse={56} sizes="(min-width: 640px) 56px, 44px" className="st-logo-bild" />
        </span>
      </span>
      <span className="st-text">
        <span className="st-fest">
          <span className="st-marke">DLIZKFI</span> –
        </span>{" "}
        {zusatz}
      </span>
    </h1>
  );
}
