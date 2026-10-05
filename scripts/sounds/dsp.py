"""Kleine bouwstenen voor het genereren van geluiden met numpy/scipy (alles mono, float)."""
import zlib

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100  # samplefrequentie voor effecten en muziek; ambience wordt apart teruggerekend


def make_rng(name):
    """Vaste seed per geluid, zodat een nieuwe run exact dezelfde bestanden geeft."""
    return np.random.default_rng(zlib.crc32(name.encode()))


def t_axis(d, sr=SR):
    return np.arange(int(sr * d)) / sr


def lp(x, f, order=2, sr=SR):
    return sosfilt(butter(order, min(f, sr / 2 - 100), btype="low", fs=sr, output="sos"), x)


def hp(x, f, order=2, sr=SR):
    return sosfilt(butter(order, f, btype="high", fs=sr, output="sos"), x)


def bp(x, lo, hi, order=2, sr=SR):
    hi = min(hi, sr / 2 - 100)
    return sosfilt(butter(order, [lo, hi], btype="band", fs=sr, output="sos"), x)


def env(t, decay, attack=0.004):
    """Snel op, dan exponentieel weg."""
    return np.clip(t / max(attack, 1e-6), 0, 1) * np.exp(-t / decay)


def adsr_swell(t, d, peak=0.5, power=1.0):
    """Zachte bult: stijgt tot `peak` (0..1 van de duur) en daalt weer."""
    x = np.clip(t / d, 0, 1)
    up = np.clip(x / peak, 0, 1) ** power
    down = np.clip((1 - x) / (1 - peak), 0, 1) ** power
    return np.minimum(up, down)


def noise(n, rng):
    return rng.standard_normal(n)


def slow_env(n, rng, cutoff, depth=1.0, sr=SR):
    """Langzaam wisselende envelop 0..1 uit gefilterde ruis (voor wind, golven, menigte)."""
    e = lp(rng.standard_normal(n), cutoff, 2, sr)
    e = (e - e.min()) / (e.max() - e.min() + 1e-9)
    return 1 - depth + depth * e


def sweep_noise(d, f0, f1, rng, width=0.6, blocks=40, sr=SR):
    """Ruis door een band waarvan het midden van f0 naar f1 loopt."""
    n = int(sr * d)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    size = max(1, n // blocks)
    for i in range(blocks):
        fc = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        seg = bp(x, fc * (1 - width * 0.5), fc * (1 + width), 2, sr)
        out[i * size:(i + 1) * size] = seg[i * size:(i + 1) * size]
    return out


def lp_sweep(x, f0, f1, blocks=40, sr=SR):
    """Laagdoorlaat waarvan de grens van f0 naar f1 loopt (explosies, ademende klanken)."""
    n = len(x)
    out = np.zeros(n)
    size = max(1, n // blocks)
    for i in range(blocks):
        fc = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        out[i * size:(i + 1) * size] = lp(x, fc, 2, sr)[i * size:(i + 1) * size]
    return out


def chirp(t, f0, f1, shape="sine"):
    """Exponentiele glijdende toon; saw/square ook mogelijk."""
    d = t[-1] if len(t) > 1 else 1.0
    k = (f1 / f0) ** (1 / d)
    phase = 2 * np.pi * f0 * (k ** t - 1) / np.log(k) if abs(k - 1) > 1e-9 else 2 * np.pi * f0 * t
    if shape == "saw":
        return 2 * ((phase / (2 * np.pi)) % 1) - 1
    if shape == "square":
        return np.sign(np.sin(phase))
    return np.sin(phase)


def tone(t, f, harmonics=(1.0,), decay=None, attack=0.005):
    """Toon met gewichten per harmonische; optioneel met afnemende envelop."""
    x = sum(a * np.sin(2 * np.pi * f * (i + 1) * t) for i, a in enumerate(harmonics))
    return x * env(t, decay, attack) if decay else x


def saw(t, f):
    return 2 * ((f * t) % 1) - 1


def vib_phase(t, f, depth=0.0, rate=5.0):
    """Fase voor een toon met vibrato (depth = relatieve frequentieafwijking)."""
    inst = f * (1 + depth * np.sin(2 * np.pi * rate * t))
    return 2 * np.pi * np.cumsum(inst) / SR


def place(buf, snippet, start_s, gain=1.0, sr=SR):
    s = int(sr * start_s)
    if s >= len(buf) or s < 0:
        return buf
    e = min(len(buf), s + len(snippet))
    buf[s:e] += snippet[: e - s] * gain
    return buf


def reverb(x, rng, t60=0.8, mix=0.25, sr=SR, tail=None):
    """Eenvoudige galm: convolutie met afnemende ruis. De uitvoer wordt `tail` seconden langer."""
    n = int(sr * t60)
    t = np.arange(n) / sr
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / t60)
    ir = lp(ir, 5000, 2, sr)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = fftconvolve(x, ir)
    out = np.zeros(max(len(wet), len(x)))
    out[: len(x)] += x * (1 - mix)
    out += wet * mix * 2.0
    if tail is not None:
        out = out[: len(x) + int(sr * tail)]
    return out


def echo(x, delay_s, gain, repeats, sr=SR):
    out = np.zeros(len(x) + int(sr * delay_s * repeats))
    out[: len(x)] += x
    for i in range(1, repeats + 1):
        place(out, lp(x, 4000 / i, 1, sr), delay_s * i, gain ** i, sr)
    return out


def formant(src, formants, sr=SR):
    """Brontoon door een paar vaste banden: klinkerachtig geluid (stemmen, grom, gefluister)."""
    out = np.zeros(len(src))
    for f, bw, g in formants:
        out += g * bp(src, max(60, f - bw / 2), f + bw / 2, 2, sr)
    return out


def peak_norm(x, peak_db=-3.0):
    x = x - np.mean(x)
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)


def fades(x, fade_in=0.003, fade_out=0.03, sr=SR):
    x = x.copy()
    fi, fo = max(1, int(sr * fade_in)), max(1, int(sr * fade_out))
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    return x


def finish(x, peak_db=-3.0, fade_in=0.003, fade_out=0.03):
    """Effect afmaken: gelijkspanning weg, naar piekniveau, zachte randen (geen klik)."""
    return fades(peak_norm(x, peak_db), fade_in, fade_out).astype(np.float32)


def trim_silence(x, thresh_db=-60.0, sr=SR):
    """Stilte aan het eind weghalen (galmstaart blijft tot hij onder de drempel komt)."""
    thr = 10 ** (thresh_db / 20) * (np.max(np.abs(x)) + 1e-9)
    idx = np.where(np.abs(x) > thr)[0]
    return x[: idx[-1] + int(0.05 * sr)] if len(idx) else x


# ---------- loops ----------

def crossfade_loop(x, n, xf):
    """x is n+xf lang: het staartstuk gaat zacht over in het begin, zodat de loop naadloos is (ruisachtig materiaal)."""
    out = x[:n].copy()
    ramp = np.linspace(0, np.pi / 2, xf)
    out[:xf] = out[:xf] * np.sin(ramp) + x[n: n + xf] * np.cos(ramp)
    return out


def wrap_loop(x, n):
    """Staart die voorbij n doorloopt wordt bij het begin opgeteld (tonale/muzikale loops)."""
    out = x[:n].copy()
    rest = x[n:]
    out[: len(rest)] += rest[: n]
    return out


def level_rms(x, rms_db, peak_cap=0.7):
    x = x - np.mean(x)
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 10 ** (rms_db / 20)
    pk = np.max(np.abs(x))
    if pk > peak_cap:
        x = x / pk * peak_cap
    return x.astype(np.float32)


def seam_jump(x):
    """Hoe hard de sprong is tussen het laatste en eerste sample, t.o.v. het gewone verschil tussen buren."""
    typical = np.mean(np.abs(np.diff(x[:2000]))) + 1e-9
    return abs(float(x[0] - x[-1])) / typical
