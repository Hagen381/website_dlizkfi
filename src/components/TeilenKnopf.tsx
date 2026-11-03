"use client";

import { useState } from "react";
import { Teilen } from "@/components/Icons";

// Teilen über das Teilen-Menü des Geräts, sonst Link in die Zwischenablage.
export default function TeilenKnopf({ titel, url }: { titel: string; url: string }) {
  const [kopiert, setKopiert] = useState(false);
  async function teilen() {
    try {
      if (navigator.share) {
        await navigator.share({ title: titel, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      /* abgebrochen */
    }
  }
  return (
    <button type="button" onClick={teilen} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-border px-3 text-sm text-text transition hover:bg-border/70">
      <Teilen />
      <span aria-live="polite">{kopiert ? "Link kopiert" : "Teilen"}</span>
    </button>
  );
}
