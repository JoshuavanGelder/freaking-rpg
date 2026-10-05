"""5 muziekloops (stemmingen). Tonale loops: noten sterven na de lusgrens weg en worden bij het begin opgeteld (dsp.wrap_loop),
dus er zit geen sprong in. Alle aanhoudende tonen hebben een frequentie met een geheel aantal perioden per loop."""
import numpy as np

from dsp import SR, bp, env, hp, level_rms, lp, noise, place, reverb, saw, t_axis, wrap_loop

MUSIC_RMS = -24.0
TAIL = 3.0  # seconden extra voor uitstervende noten

NOTE = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def hz(name):
    """'A3' -> 220 Hz."""
    n = name[:-1]
    octave = int(name[-1])
    midi = NOTE[n] + 12 * (octave + 1)
    return 440.0 * 2 ** ((midi - 69) / 12)


def snap(f, d):
    """Frequentie met een geheel aantal perioden binnen d seconden."""
    return max(1, round(f * d)) / d


def _pad(freqs, dur, rng, bright=2200, attack=0.9, release=1.6, detune=0.003):
    n = int(SR * (dur + release + 0.5))
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        x += saw(t, f) + saw(t, f * (1 + detune)) * 0.8 + 0.6 * np.sin(2 * np.pi * f * t)
    x = lp(x, bright, 2) / max(1, len(freqs))
    a = np.clip(t / attack, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    return x * a


def _pluck(f, dur=1.6, dec=0.5, bright=0.5):
    t = t_axis(dur)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.15) + 0.2 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.08)) * env(t, dec, 0.004)


def _bell(f, dur=2.5, dec=0.9):
    t = t_axis(dur)
    return (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.4) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.2)) * env(t, dec, 0.002)


def _finish(x, d):
    return level_rms(wrap_loop(x, int(SR * d)), MUSIC_RMS)


def _canvas(d):
    return np.zeros(int(SR * (d + TAIL)))


def calm(rng):
    d = 32.0
    x = _canvas(d)
    chords = [["C3", "G3", "E4", "B4"], ["A2", "E3", "C4", "G4"], ["F2", "C3", "A3", "E4"], ["G2", "D3", "B3", "F4"]]
    arp = [["E4", "G4", "B4", "G4"], ["C4", "E4", "G4", "E4"], ["A3", "C4", "E4", "C4"], ["B3", "D4", "F4", "D4"]]
    for i, ch in enumerate(chords):
        s = i * 8.0
        place(x, _pad([hz(n) for n in ch], 8.0, rng, bright=1500) * 0.35, s)
        for k in range(8):
            place(x, _pluck(hz(arp[i][k % 4]) * (2 if k % 4 == 3 else 1), 1.8, 0.7), s + 0.5 + k * 1.0, 0.12)
    return _finish(reverb(x, rng, 2.2, 0.35)[: len(x)], d)


def sad(rng):
    d = 32.0
    x = _canvas(d)
    chords = [["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"]]
    melody = [("E5", 0.0, 3.0), ("D5", 3.0, 2.0), ("C5", 5.0, 3.0),
              ("C5", 8.0, 2.0), ("A4", 10.0, 3.0), ("C5", 13.0, 3.0),
              ("G4", 16.0, 3.0), ("E5", 19.0, 2.0), ("D5", 21.0, 3.0),
              ("B4", 24.0, 3.0), ("D5", 27.0, 2.0), ("G4", 29.0, 3.0)]
    for i, ch in enumerate(chords):
        place(x, _pad([hz(n) for n in ch], 8.0, rng, bright=1100, attack=1.3, release=2.2) * 0.38, i * 8.0)
    for name, s, ln in melody:
        tt = t_axis(ln + 1.2)
        ph = 2 * np.pi * np.cumsum(hz(name) * (1 + 0.006 * np.sin(2 * np.pi * 5 * tt) * np.clip(tt / 0.8, 0, 1))) / SR
        v = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.clip(tt / 0.25, 0, 1) * np.where(tt < ln, 1.0, np.exp(-(tt - ln) / 0.4))
        place(x, lp(v, 2600, 2), s, 0.18)
    return _finish(reverb(x, rng, 2.6, 0.4)[: len(x)], d)


def tense(rng):
    bpm = 70
    beats = 36
    d = beats * 60 / bpm
    n = int(SR * (d + TAIL))
    t = np.arange(n) / SR
    n_out = int(SR * d)
    t1 = np.arange(n_out) / SR
    # Aanhoudende lagen zijn precies periodiek over de loop (geheel aantal perioden); het filter draait over drie keer dezelfde loop,
    # zodat begin en eind in dezelfde stationaire toestand zitten.
    saws = saw(t1, snap(55.0, d)) + saw(t1, snap(55.4, d)) * 0.8
    drone_p = lp(np.tile(saws, 3), 260, 2)[n_out: 2 * n_out] * 0.6
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * (round(d / 4) / d) * t1)
    cluster_p = (np.sin(2 * np.pi * snap(110.0, d) * t1) + np.sin(2 * np.pi * snap(116.5, d) * t1) + 0.6 * np.sin(2 * np.pi * snap(164.8, d) * t1)) * lfo
    noise_p = lp(np.tile(noise(n_out, rng), 3), 300, 2)[n_out: 2 * n_out] * 0.08
    x = np.zeros(n)
    x[:n_out] = drone_p + cluster_p * 0.18 + noise_p
    for b in range(beats):
        s = b * 60 / bpm
        tt = t_axis(0.5)
        lub = np.sin(2 * np.pi * (80 * np.exp(-tt * 14) + 42) * tt) * env(tt, 0.12, 0.002)
        place(x, lub, s, 0.55)
        place(x, lub, s + 0.22, 0.38)
    for s in [d * 0.25, d * 0.6, d * 0.85]:
        tt = t_axis(2.4)
        sw = bp(noise(len(tt), rng), 1500, 5000, 2) * np.sin(np.pi * np.clip(tt / 2.4, 0, 1)) ** 2 * 0.05
        place(x, sw, s)
    return level_rms(wrap_loop(reverb(x, rng, 1.8, 0.25)[: len(x)], int(SR * d)), MUSIC_RMS)


def action(rng):
    bpm = 140
    bars = 16
    beat = 60 / bpm
    d = bars * 4 * beat
    x = _canvas(d)
    bass_pat = ["A1", "A1", "C2", "A1", "G1", "A1", "E2", "G1"]
    chords = [["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["G2", "D3", "G3", "B3"], ["E2", "B2", "E3", "G3"]]
    for bar in range(bars):
        s0 = bar * 4 * beat
        for b in range(4):
            s = s0 + b * beat
            tk = t_axis(0.35)
            kick = np.sin(2 * np.pi * (140 * np.exp(-tk * 30) + 48) * tk) * env(tk, 0.12, 0.001)
            place(x, kick, s, 0.9)
            if b in (1, 3):
                sn = t_axis(0.3)
                snare = bp(noise(len(sn), rng), 1500, 6000, 2) * env(sn, 0.09, 0.001) + np.sin(2 * np.pi * 190 * sn) * env(sn, 0.06, 0.001) * 0.5
                place(x, snare, s, 0.6)
        for e in range(8):
            s = s0 + e * beat / 2
            hh = t_axis(0.08)
            place(x, hp(noise(len(hh), rng), 7000) * env(hh, 0.018, 0.0005), s, 0.28 if e % 2 else 0.2)
            tb = t_axis(beat / 2 + 0.05)
            f = hz(bass_pat[(e + (bar // 4) * 2) % 8])
            place(x, lp(saw(tb, f) + 0.5 * saw(tb, f * 1.004), 700, 2) * env(tb, 0.2, 0.004), s, 0.42)
        ch = chords[(bar // 2) % 4]
        if bar % 2 == 0:
            place(x, _pad([hz(n) for n in ch], 2 * 4 * beat - 0.2, rng, bright=2600, attack=0.05, release=0.3) * 0.2, s0)
    return _finish(reverb(x, rng, 0.7, 0.12)[: len(x)], d)


def triumph(rng):
    d = 32.0
    x = _canvas(d)
    chords = [["C3", "G3", "C4", "E4", "G4"], ["G2", "D3", "G3", "B3", "D4"], ["A2", "E3", "A3", "C4", "E4"], ["F2", "C3", "F3", "A3", "C4"]]
    arps = [["C5", "E5", "G5", "E5"], ["B4", "D5", "G5", "D5"], ["C5", "E5", "A5", "E5"], ["A4", "C5", "F5", "C5"]]
    for i, ch in enumerate(chords):
        s = i * 8.0
        place(x, _pad([hz(n) for n in ch], 8.0, rng, bright=2800, attack=0.35, release=1.4) * 0.34, s)
        tp = t_axis(1.2)
        timp = np.sin(2 * np.pi * (95 * np.exp(-tp * 6) + 55) * tp) * env(tp, 0.5, 0.003)
        place(x, timp, s, 0.7)
        place(x, timp, s + 4.0, 0.45)
        for k in range(16):
            place(x, _bell(hz(arps[i][k % 4]), 1.6, 0.5), s + k * 0.5, 0.07)
    return _finish(reverb(x, rng, 2.0, 0.3)[: len(x)], d)


MUSIC = {"calm": calm, "tense": tense, "action": action, "sad": sad, "triumph": triumph}
