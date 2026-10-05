#!/usr/bin/env python3
"""Maakt alle geluiden van Freaking RPG opnieuw: assets/sounds/*.ogg en src/soundFiles.ts.

Gebruik (vanuit de projectmap):  python3 scripts/sounds/build.py [naam ...]
Zonder namen worden alle geluiden gemaakt. De lijst staat in rpg/sounds.json (de enige bron van waarheid);
elke tag, loop, stemming en variant daarin krijgt een bestand. Vereist numpy, scipy en ffmpeg (libvorbis).
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from dsp import SR, make_rng, seam_jump  # noqa: E402
from effects import EFFECTS, VARIANTS  # noqa: E402
from ambience import AMBIENCE  # noqa: E402
from music import MUSIC  # noqa: E402

OUT = os.path.join(ROOT, "assets", "sounds")
TS_OUT = os.path.join(ROOT, "src", "soundFiles.ts")
REGISTRY = os.path.join(ROOT, "rpg", "sounds.json")


def encode(x, path, kind):
    """kind: sfx (44,1 kHz), loop of music (32 kHz, kleiner). Mono ogg/vorbis."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "in.wav")
        wavfile.write(wav, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        args = ["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-ac", "1", "-c:a", "libvorbis"]
        args += ["-q:a", "3"] if kind == "sfx" else ["-ar", "32000", "-q:a", "2"]
        subprocess.run(args + [path], check=True)


def check(name, x, kind):
    """Objectieve controles (naar luisteren kan ik niet): geen NaN, geen clipping, geen stilte, loop zonder sprong."""
    problems = []
    if not np.all(np.isfinite(x)):
        problems.append("NaN/inf")
    pk = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x ** 2)))
    dur = len(x) / SR
    if pk > 0.95:
        problems.append(f"piek te hoog ({pk:.2f})")
    if rms < 0.002:
        problems.append("bijna stil")
    if kind == "sfx" and not (0.05 <= dur <= 4.0):
        problems.append(f"duur {dur:.2f}s")
    if kind != "sfx":
        jump = seam_jump(x)
        if jump > 8:
            problems.append(f"sprong bij de lusgrens ({jump:.1f}x)")
    return pk, rms, dur, problems


def jobs():
    reg = json.load(open(REGISTRY))
    todo = {}
    sfx = reg["sfx"]["claude"] + reg["sfx"]["auto"] + reg["sfx"]["app"]
    for tag in sfx:
        todo[tag] = ("sfx", EFFECTS[tag])
    for pack, tags in reg["variants"].items():
        for tag in tags:
            todo[f"{tag}__{pack}"] = ("sfx", VARIANTS[(tag, pack)])
    for amb in reg["ambience"]:
        todo[f"amb_{amb}"] = ("loop", AMBIENCE[amb])
    for mood in reg["moods"]:
        todo[f"music_{mood}"] = ("music", MUSIC[mood])
    return todo


def write_ts(names):
    lines = [
        "// GEGENEREERD door scripts/sounds/build.py: niet met de hand aanpassen.",
        "// Metro heeft vaste require-paden nodig; daarom staat elk geluidsbestand hier met naam.",
        "declare function require(path: string): number;",
        "",
        "export const SOUND_FILES: Record<string, number> = {",
    ]
    for n in sorted(names):
        lines.append(f"  '{n}': require('../assets/sounds/{n}.ogg'),")
    lines += ["};", ""]
    open(TS_OUT, "w").write("\n".join(lines))


def main():
    only = set(sys.argv[1:])
    todo = jobs()
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    total = 0
    for name, (kind, fn) in sorted(todo.items()):
        if only and name not in only:
            continue
        x = fn(make_rng(name))
        pk, rms, dur, problems = check(name, x, kind)
        path = os.path.join(OUT, f"{name}.ogg")
        encode(x, path, kind)
        size = os.path.getsize(path)
        total += size
        flag = "  <-- " + "; ".join(problems) if problems else ""
        bad += bool(problems)
        print(f"{name:26s} {dur:5.1f}s  piek {20 * np.log10(pk + 1e-9):6.1f} dB  rms {20 * np.log10(rms + 1e-9):6.1f} dB  {size / 1024:6.1f} KB{flag}")
    if not only:
        write_ts(todo.keys())
    print(f"\n{len(todo) if not only else len(only)} geluiden, {total / 1024 / 1024:.2f} MB, {bad} met aandachtspunt")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
