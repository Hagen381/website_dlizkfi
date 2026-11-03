"use client";

import { useEffect, useRef, useState } from "react";
import { beiFremdemStart, meldeStart, zeitText } from "@/lib/audio";
import { PauseIcon, PlayIcon } from "@/components/Icons";

const TEMPI = [1, 1.25, 1.5, 2];

// Schlanker HTML5-Player für die Folgenseite (Nachbau des PodView-Players:
// Play-Knopf, Fortschrittsbalken, Zeit, Tempo). preload="none": Audio wird
// erst beim Klick auf Play von Spotify/anchor geladen.
export default function Player({ src, titel, dauer }: { src: string; titel: string; dauer: number | null }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [spielt, setSpielt] = useState(false);
  const [zeit, setZeit] = useState(0);
  const [gesamt, setGesamt] = useState(dauer ?? 0);
  const [tempo, setTempo] = useState(1);
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    return beiFremdemStart(a, () => a.pause());
  }, []);

  function umschalten() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      meldeStart(a);
      setLaedt(true);
      void a.play().catch(() => setLaedt(false));
    } else a.pause();
  }

  function springen(wert: number) {
    const a = audio.current;
    setZeit(wert);
    if (a) a.currentTime = wert;
  }

  function tempoWechseln() {
    const naechstes = TEMPI[(TEMPI.indexOf(tempo) + 1) % TEMPI.length];
    setTempo(naechstes);
    if (audio.current) audio.current.playbackRate = naechstes;
  }

  const anteil = gesamt ? Math.min(100, (zeit / gesamt) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-surface to-[#f6efd9] p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={umschalten}
          aria-label={spielt ? "Pause" : `Abspielen: ${titel}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-text shadow-sm transition hover:opacity-90 active:scale-95"
        >
          {spielt ? <PauseIcon /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={gesamt || 0}
          step={1}
          value={Math.floor(zeit)}
          onChange={(e) => springen(Number(e.target.value))}
          aria-label="Abspielposition"
          aria-valuetext={`${zeitText(zeit)} von ${zeitText(gesamt)}`}
          className="spieler-balken h-11 min-w-0 flex-1 cursor-pointer"
          style={{ ["--anteil" as string]: `${anteil}%` }}
        />
        <span className="hidden shrink-0 font-mono text-xs text-muted tabular-nums sm:inline" aria-hidden="true">
          {zeitText(zeit)} / {zeitText(gesamt)}
        </span>
        <button
          type="button"
          onClick={tempoWechseln}
          aria-label={`Abspielgeschwindigkeit ${tempo}-fach, ändern`}
          className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-2 font-mono text-xs font-semibold text-muted transition hover:bg-border/60 hover:text-text"
        >
          {String(tempo).replace(".", ",")}×
        </button>
      </div>
      <p className="mt-1 pl-14 font-mono text-xs text-muted tabular-nums sm:hidden" aria-hidden="true">
        {zeitText(zeit)} / {zeitText(gesamt)}
      </p>
      {laedt && !spielt && <p className="sr-only" role="status">Folge wird geladen …</p>}
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setSpielt(true)}
        onPlaying={() => setLaedt(false)}
        onPause={() => setSpielt(false)}
        onEnded={() => setSpielt(false)}
        onTimeUpdate={(e) => setZeit(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setGesamt(e.currentTarget.duration)}
      />
    </div>
  );
}
