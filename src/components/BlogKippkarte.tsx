"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

// Hülle einer Blog-Karte: leichte 3D-Neigung zur Mausposition (max. ~3,5°).
// Setzt nur die CSS-Variablen --kipp-x/--kipp-y; Anheben, Schatten und
// Übergänge stehen in globals.css (.blog-karte). Nur Maus (kein Touch/Stift),
// nicht bei prefers-reduced-motion.
const MAX = 3.5;

export default function BlogKippkarte({ className = "", children }: { className?: string; children: ReactNode }) {
  const el = useRef<HTMLElement>(null);

  const bewegen = (e: PointerEvent<HTMLElement>) => {
    const k = el.current;
    if (!k || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = k.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    k.style.setProperty("--kipp-y", `${(x * 2 * MAX).toFixed(2)}deg`);
    k.style.setProperty("--kipp-x", `${(-y * 2 * MAX).toFixed(2)}deg`);
  };
  const zuruecksetzen = () => {
    el.current?.style.removeProperty("--kipp-x");
    el.current?.style.removeProperty("--kipp-y");
  };

  return (
    <article ref={el} onPointerMove={bewegen} onPointerLeave={zuruecksetzen} className={`blog-karte ${className}`}>
      {children}
    </article>
  );
}
