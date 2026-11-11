"use client";

import { useEffect } from "react";

// Neigt .kipp-Elemente leicht zur Mausposition (3D-Kippeffekt, siehe .kipp in
// globals.css). EIN Listener für die ganze Seite statt einer Hülle pro
// Element: setzt nur --kipp-x/--kipp-y, Obergrenze aus --kipp-max der Stärke
// (.kipp-karte 3,5°, .kipp-dezent 2°). Breite Elemente (z. B. Folgen-Karten
// über die ganze Zeile) kippen entsprechend weniger, damit sich ihre Ränder
// nicht weiter bewegen als bei einer Blog-Karte (~400 px). Nur Maus (kein
// Touch/Stift), nicht bei prefers-reduced-motion. Rendert nichts.
const BEZUG = 400; // px: bis zu dieser Größe volle Neigung
export default function KippSteuerung() {
  useEffect(() => {
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
    let aktiv: HTMLElement | null = null;
    let max = 0; // Grad, Grenze der Stärke
    let bild = 0;
    let x = 0;
    let y = 0;

    const loslassen = () => {
      if (!aktiv) return;
      aktiv.style.removeProperty("--kipp-x");
      aktiv.style.removeProperty("--kipp-y");
      aktiv = null;
    };
    const zeichnen = () => {
      bild = 0;
      if (!aktiv) return;
      const r = aktiv.getBoundingClientRect();
      const dx = (x - r.left) / r.width - 0.5; // -0.5 … 0.5
      const dy = (y - r.top) / r.height - 0.5;
      const maxY = max * Math.min(1, BEZUG / r.width); // Drehung um die senkrechte Achse
      const maxX = max * Math.min(1, BEZUG / r.height);
      aktiv.style.setProperty("--kipp-y", `${(dx * 2 * maxY).toFixed(2)}deg`);
      aktiv.style.setProperty("--kipp-x", `${(-dy * 2 * maxX).toFixed(2)}deg`);
    };
    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || ruhig.matches) return loslassen();
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".kipp") ?? null;
      if (el !== aktiv) {
        loslassen();
        if (!el) return;
        aktiv = el;
        max = parseFloat(getComputedStyle(el).getPropertyValue("--kipp-max")) || 0;
      }
      x = e.clientX;
      y = e.clientY;
      if (!bild) bild = requestAnimationFrame(zeichnen);
    };
    const raus = (e: PointerEvent) => {
      if (!e.relatedTarget) loslassen(); // Maus hat das Fenster verlassen
    };

    document.addEventListener("pointermove", bewegen, { passive: true });
    document.addEventListener("pointerout", raus, { passive: true });
    return () => {
      document.removeEventListener("pointermove", bewegen);
      document.removeEventListener("pointerout", raus);
      if (bild) cancelAnimationFrame(bild);
      loslassen();
    };
  }, []);
  return null;
}
