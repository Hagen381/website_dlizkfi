"use client";

import { useEffect } from "react";

// Nur für den Entwurf der Startseiten-Collage (/entwurf/startseite/, nur
// Vorschau). Ein Listener für den ganzen Hero, nur Maus, per rAF:
// - Polaroid unter der Maus: --tx/--ty (Neigung, max. 8°) und --gx/--gy
//   (Lichtreflex) auf .pola-rahmen.
// - Glasfläche: --glas-x/--glas-y (Neigung, max. 2,5°) und --mx/--my
//   (Lichtschimmer). Nicht unter 640 px.
// Nicht bei prefers-reduced-motion. Rendert nichts.
const POLA_MAX = 8;
const GLAS_MAX = 2.5;

export default function CollageSteuerung() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".collage-hero");
    const glas = hero?.querySelector<HTMLElement>(".collage-glas");
    if (!hero || !glas) return;
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
    const schmal = matchMedia("(max-width: 639px)");
    let pola: HTMLElement | null = null;
    let glasAktiv = false;
    let bild = 0;
    let x = 0;
    let y = 0;

    const polaLos = () => {
      if (!pola) return;
      pola.style.removeProperty("--tx");
      pola.style.removeProperty("--ty");
      pola = null;
    };
    const glasLos = () => {
      if (!glasAktiv) return;
      glas.style.removeProperty("--glas-x");
      glas.style.removeProperty("--glas-y");
      glasAktiv = false;
    };
    const zeichnen = () => {
      bild = 0;
      if (pola) {
        const r = pola.getBoundingClientRect();
        const dx = (x - r.left) / r.width;
        const dy = (y - r.top) / r.height;
        pola.style.setProperty("--ty", `${((dx - 0.5) * 2 * POLA_MAX).toFixed(1)}deg`);
        pola.style.setProperty("--tx", `${((0.5 - dy) * 2 * POLA_MAX).toFixed(1)}deg`);
        pola.style.setProperty("--gx", `${(dx * 100).toFixed(0)}%`);
        pola.style.setProperty("--gy", `${(dy * 100).toFixed(0)}%`);
      }
      if (glasAktiv) {
        const r = glas.getBoundingClientRect();
        const dx = (x - r.left) / r.width;
        const dy = (y - r.top) / r.height;
        glas.style.setProperty("--glas-y", `${((dx - 0.5) * 2 * GLAS_MAX).toFixed(2)}deg`);
        glas.style.setProperty("--glas-x", `${((0.5 - dy) * 2 * GLAS_MAX).toFixed(2)}deg`);
        glas.style.setProperty("--mx", `${(x - r.left).toFixed(0)}px`);
        glas.style.setProperty("--my", `${(y - r.top).toFixed(0)}px`);
      }
    };
    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || ruhig.matches) {
        polaLos();
        glasLos();
        return;
      }
      const ziel = e.target as Element | null;
      const neu = ziel?.closest?.<HTMLElement>(".pola")?.querySelector<HTMLElement>(".pola-rahmen") ?? null;
      if (neu !== pola) polaLos();
      pola = neu;
      const imGlas = !schmal.matches && !!ziel?.closest?.(".collage-glas");
      if (!imGlas) glasLos();
      glasAktiv = imGlas;
      x = e.clientX;
      y = e.clientY;
      if (!bild && (pola || glasAktiv)) bild = requestAnimationFrame(zeichnen);
    };
    const verlassen = () => {
      polaLos();
      glasLos();
    };

    hero.addEventListener("pointermove", bewegen, { passive: true });
    hero.addEventListener("pointerleave", verlassen);
    return () => {
      hero.removeEventListener("pointermove", bewegen);
      hero.removeEventListener("pointerleave", verlassen);
      if (bild) cancelAnimationFrame(bild);
    };
  }, []);
  return null;
}
