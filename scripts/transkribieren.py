#!/usr/bin/env python3
"""Transkribiert EINE Folge aus content/folgen.json mit faster-whisper.

Läuft im Workflow .github/workflows/transkribieren.yml (ein Job pro Folge).

    python scripts/transkribieren.py <slug> <mp3-datei> <ausgabe-ordner> [--modell large-v3]

Schreibt in <ausgabe-ordner>/<slug>/:
    transkript.md   Fließtext in Absätzen, etwa alle 2–3 Minuten eine
                    Zeitmarke [mm:ss]; oben Titel, Datum, Dauer, Modell
    segmente.json   Rohsegmente (start, ende, text) + Metadaten

Der Text bleibt WÖRTLICH so, wie Whisper ihn liefert. Das Skript setzt nur
Absätze und Zeitmarken — es korrigiert und glättet nichts.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent

# Namen und Begriffe, die richtig geschrieben werden sollen, als
# initial_prompt (Kontext für das erste 30-Sekunden-Fenster).
#
# KEINE hotwords: Im Probelauf mit large-v3 hat Whisper die hotword-Liste
# wörtlich und vielfach in den Text geschrieben ("Hagen Heinrich Hermine Koh
# Samui …") und dafür echte Passagen weggelassen. Die Namen erkennt Whisper
# auch ohne hotwords zuverlässig (erster Lauf).
PROMPT_BEGRIFFE = ["Juliette", "Hagen", "Heinrich", "Hermine", "Koh Samui", "Thailand", "Bangkok", "DLIZKFI", "Visum", "Immigration"]
INITIAL_PROMPT = (
    "Das Leben ist zu kurz für irgendwann – der Podcast DLIZKFI. "
    "Mit Juliette, Hagen, Heinrich und Hermine auf Koh Samui (Samui) in Thailand, "
    "Bangkok, Visum, Immigration, Farang, Thai."
)

# Absätze: frühestens nach ABSATZ_MIN Sekunden an einem Satzende umbrechen,
# spätestens nach ABSATZ_MAX Sekunden am nächsten Segment.
ABSATZ_MIN = 150  # 2:30
ABSATZ_MAX = 200  # 3:20

MARKER = "<!-- dlizkfi-transkript: nicht auf der Website ausliefern -->"

# Schleifen-Erkennung: Whisper wiederholt manchmal denselben Satz in
# 1-Sekunden-Segmenten, statt den echten Ton zu erkennen (im ersten Lauf
# 9× in Folge). Gemeldet wird, wenn derselbe Text (ab SCHLEIFE_MIN_ZEICHEN
# Zeichen) innerhalb von SCHLEIFE_FENSTER Sekunden mindestens
# SCHLEIFE_MIN_ANZAHL-mal vorkommt. Der Text wird NICHT verändert.
SCHLEIFE_MIN_ZEICHEN = 15
SCHLEIFE_MIN_ANZAHL = 3
SCHLEIFE_FENSTER = 60


def normal(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum() or ch == " ").strip()


# Typische Whisper-Halluzinationen (Abspann-/Untertitel-Floskeln aus den
# Trainingsdaten) und das Abschreiben des Prompts. Gemeldet, nicht entfernt.
HALLUZINATION_FLOSKELN = ["wdr", "untertitel", "amara", "copyright", "www.", "mediagroup", "swr", "zdf", "vielen dank fürs zuschauen"]
# Nicht in der Liste: „abonniert" — kommt im Podcast ständig wirklich vor
# („abonniert mich einfach") und gab im 75er-Lauf 3 Fehlalarme.


def halluzinationen_finden(segmente: list[dict]) -> list[dict]:
    gefunden = []
    for seg in segmente:
        t = seg["text"].lower()
        prompt_treffer = sum(1 for b in PROMPT_BEGRIFFE if b.lower() in t)
        rest = t
        for b in PROMPT_BEGRIFFE:
            rest = rest.replace(b.lower(), " ")
        rest_woerter = len([w for w in rest.split() if any(c.isalpha() for c in w)])
        # Prompt abgeschrieben = mindestens 4 Prompt-Begriffe und kaum andere
        # Wörter (ein echter Satz mit vier Namen fällt nicht darunter).
        prompt_kopie = prompt_treffer >= 4 and rest_woerter <= prompt_treffer
        floskeln = [f for f in HALLUZINATION_FLOSKELN if f in t]
        if prompt_kopie or floskeln:
            gefunden.append({"start": seg["start"], "ende": seg["ende"], "text": seg["text"], "grund": "Prompt abgeschrieben" if prompt_kopie else "Floskel: " + ", ".join(floskeln)})
    return gefunden


def schleifen_finden(segmente: list[dict]) -> list[dict]:
    gefunden: list[dict] = []
    i = 0
    while i < len(segmente):
        t = normal(segmente[i]["text"])
        if len(t) >= SCHLEIFE_MIN_ZEICHEN:
            treffer = [j for j in range(i, len(segmente)) if segmente[j]["start"] - segmente[i]["start"] <= SCHLEIFE_FENSTER and normal(segmente[j]["text"]) == t]
            if len(treffer) >= SCHLEIFE_MIN_ANZAHL:
                gefunden.append({"start": segmente[i]["start"], "ende": segmente[treffer[-1]]["ende"], "anzahl": len(treffer), "text": segmente[i]["text"]})
                i = treffer[-1] + 1
                continue
        i += 1
    return gefunden


def zeit(sek: float) -> str:
    """[mm:ss] — Minuten laufen über 59 hinaus weiter (z. B. [61:05])."""
    s = int(sek)
    return f"{s // 60:02d}:{s % 60:02d}"


def dauer_text(sek: float | None) -> str:
    if not sek:
        return "unbekannt"
    s = int(round(sek))
    h, rest = divmod(s, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def absaetze(segmente: list[dict]) -> list[tuple[float, str]]:
    """Fasst Segmente zu Absätzen zusammen. Text bleibt unverändert."""
    ergebnis: list[tuple[float, str]] = []
    start = None
    teile: list[str] = []
    for seg in segmente:
        text = seg["text"].strip()
        if not text:
            continue
        if start is None:
            start = seg["start"]
        teile.append(text)
        laenge = seg["ende"] - start
        satzende = text.endswith((".", "!", "?", "…", '"', "“", "»"))
        if (laenge >= ABSATZ_MIN and satzende) or laenge >= ABSATZ_MAX:
            ergebnis.append((start, " ".join(teile)))
            start, teile = None, []
    if teile:
        ergebnis.append((start, " ".join(teile)))
    return ergebnis


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("mp3")
    ap.add_argument("ausgabe")
    ap.add_argument("--modell", default="large-v3")
    ap.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    args = ap.parse_args()

    folgen = json.loads((WURZEL / "content/folgen.json").read_text("utf-8"))["folgen"]
    folge = next((f for f in folgen if f["slug"] == args.slug), None)
    if not folge:
        print(f"Slug nicht in content/folgen.json: {args.slug}", file=sys.stderr)
        return 1

    from faster_whisper import WhisperModel  # erst hier: Slug-Fehler sofort melden

    t0 = time.monotonic()
    modell = WhisperModel(args.modell, device="cpu", compute_type="int8", cpu_threads=args.threads)
    t_modell = time.monotonic() - t0

    t1 = time.monotonic()
    seg_iter, info = modell.transcribe(
        args.mp3,
        language="de",
        task="transcribe",
        vad_filter=True,
        initial_prompt=INITIAL_PROMPT,
        # Aus: Mit dem vorherigen Text als Kontext lief Whisper im ersten Lauf
        # in Wiederholungsschleifen (gleicher Satz bis zu 9×, der echte Ton
        # an dieser Stelle fehlte).
        condition_on_previous_text=False,
        beam_size=5,
    )
    segmente = []
    letzte_meldung = 0.0
    for s in seg_iter:
        segmente.append(
            {
                "start": round(s.start, 2),
                "ende": round(s.end, 2),
                "text": s.text.strip(),
                "avg_logprob": round(s.avg_logprob, 3),
                "no_speech_prob": round(s.no_speech_prob, 3),
                "compression_ratio": round(s.compression_ratio, 2),
            }
        )
        if s.end - letzte_meldung >= 300:  # alle 5 Audio-Minuten ein Lebenszeichen
            letzte_meldung = s.end
            print(f"  {zeit(s.end)} von {dauer_text(info.duration)} — {time.monotonic() - t1:.0f}s Rechenzeit", flush=True)
    t_transkription = time.monotonic() - t1

    schleifen = schleifen_finden(segmente)
    for sch in schleifen:
        print(f"::warning title=Mögliche Schleife ({args.slug})::[{zeit(sch['start'])}] {sch['anzahl']}× „{sch['text'][:80]}“")
    halluzinationen = halluzinationen_finden(segmente)
    for h in halluzinationen:
        print(f"::warning title=Mögliche Halluzination ({args.slug})::[{zeit(h['start'])}] {h['grund']}: „{h['text'][:80]}“")

    ziel = Path(args.ausgabe) / args.slug
    ziel.mkdir(parents=True, exist_ok=True)

    meta = {
        "slug": folge["slug"],
        "titel": folge["titel"],
        "datum": folge["datum"],
        "dauer_sekunden": folge.get("dauer") or round(info.duration),
        "guid": folge["guid"],
        "modell": args.modell,
        "werkzeug": "faster-whisper (CPU, int8)",
        "sprache": "de",
        "vad_filter": True,
        "condition_on_previous_text": False,
        "initial_prompt": INITIAL_PROMPT,
        "erstellt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "laufzeit_sekunden": {
            "modell_laden": round(t_modell),
            "transkription": round(t_transkription),
        },
        "echtzeitfaktor": round(t_transkription / info.duration, 2) if info.duration else None,
        "anzahl_segmente": len(segmente),
        "moegliche_schleifen": schleifen,
        "moegliche_halluzinationen": halluzinationen,
    }
    (ziel / "segmente.json").write_text(
        json.dumps({"meta": meta, "segmente": segmente}, ensure_ascii=False, indent=1) + "\n", "utf-8"
    )

    datum = datetime.fromisoformat(folge["datum"].replace("Z", "+00:00")).strftime("%d.%m.%Y")
    zeilen = [
        MARKER,
        "",
        f"# {folge['titel']}",
        "",
        f"- **Datum:** {datum}",
        f"- **Dauer:** {dauer_text(meta['dauer_sekunden'])}",
        f"- **Modell:** faster-whisper {args.modell} (CPU, int8), Sprache de, VAD-Filter an",
        f"- **Folge:** /episodes/{folge['slug']}/",
        f"- **Erstellt:** {meta['erstellt']}",
        "",
        "> Automatisch erstelltes Rohtranskript, wörtlich und ungeprüft. "
        "Nur Absätze und Zeitmarken wurden gesetzt. Nicht auf der Website veröffentlicht.",
        "",
    ]
    for start, text in absaetze(segmente):
        zeilen += [f"**[{zeit(start)}]** {text}", ""]
    (ziel / "transkript.md").write_text("\n".join(zeilen), "utf-8")

    print(
        f"Fertig: {args.slug} — Audio {dauer_text(info.duration)}, "
        f"Transkription {dauer_text(t_transkription)} (Faktor {meta['echtzeitfaktor']}), "
        f"Modell laden {t_modell:.0f}s, {len(segmente)} Segmente, {len(schleifen)} mögliche Schleife(n), {len(halluzinationen)} mögliche Halluzination(en)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
