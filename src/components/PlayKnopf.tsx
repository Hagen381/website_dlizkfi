"use client";

import { useEffect, useRef, useState } from "react";
import { beiFremdemStart, meldeStart } from "@/lib/audio";
import { PauseIcon, PlayIcon } from "@/components/Icons";

// Runder Play-Knopf der Folgenkarten. Spielt die Folge direkt in der Liste ab.
// preload="none": vor dem ersten Klick wird nichts geladen.
export default function PlayKnopf({ src, titel }: { src: string; titel: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [spielt, setSpielt] = useState(false);

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
      void a.play();
    } else a.pause();
  }

  return (
    <>
      <button
        type="button"
        onClick={umschalten}
        aria-label={`${spielt ? "Pause" : "Abspielen"}: ${titel}`}
        aria-pressed={spielt}
        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-text shadow-sm transition hover:scale-105 hover:shadow-md active:scale-95"
      >
        {spielt ? <PauseIcon /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
      </button>
      <audio ref={audio} src={src} preload="none" onPlay={() => setSpielt(true)} onPause={() => setSpielt(false)} onEnded={() => setSpielt(false)} />
    </>
  );
}
