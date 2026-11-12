"use client";

import { useEffect } from "react";

// Polaroids der Über-Seite (Entwurf): Neigung zur Maus (max. 8°) und
// Lichtreflex wie auf der Startseite. Ein Listener für die ganze Seite, nur
// Maus, per rAF, nicht bei prefers-reduced-motion.
export default function PolaroidNeigung() {
  useEffect(() => {
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
    let aktiv: HTMLElement | null = null;
    let bild = 0;
    const los = () => {
      aktiv?.style.removeProperty("--tx");
      aktiv?.style.removeProperty("--ty");
      aktiv = null;
    };
    const bewegen = (e: PointerEvent) => {
      const rahmen = e.pointerType === "mouse" && !ruhig.matches ? ((e.target as Element | null)?.closest?.(".ab-pola")?.querySelector<HTMLElement>(".ab-pola-rahmen") ?? null) : null;
      if (rahmen !== aktiv) los();
      if (!rahmen) return;
      aktiv = rahmen;
      cancelAnimationFrame(bild);
      bild = requestAnimationFrame(() => {
        const r = rahmen.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        rahmen.style.setProperty("--ty", `${((x - 0.5) * 16).toFixed(1)}deg`);
        rahmen.style.setProperty("--tx", `${((0.5 - y) * 16).toFixed(1)}deg`);
        rahmen.style.setProperty("--gx", `${(x * 100).toFixed(0)}%`);
        rahmen.style.setProperty("--gy", `${(y * 100).toFixed(0)}%`);
      });
    };
    document.addEventListener("pointermove", bewegen, { passive: true });
    return () => {
      cancelAnimationFrame(bild);
      document.removeEventListener("pointermove", bewegen);
    };
  }, []);
  return null;
}
