// Es spielt immer nur ein Audio gleichzeitig: wer startet, meldet sich hier,
// alle anderen pausieren.
const EREIGNIS = "dlizkfi:audio-start";

export function meldeStart(audio: HTMLAudioElement) {
  window.dispatchEvent(new CustomEvent(EREIGNIS, { detail: audio }));
}

export function beiFremdemStart(audio: HTMLAudioElement, pausieren: () => void) {
  const f = (e: Event) => {
    if ((e as CustomEvent).detail !== audio) pausieren();
  };
  window.addEventListener(EREIGNIS, f);
  return () => window.removeEventListener(EREIGNIS, f);
}

export function zeitText(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const zz = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${zz(m)}:${zz(s % 60)}` : `${m}:${zz(s % 60)}`;
}
