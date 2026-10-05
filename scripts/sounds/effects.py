"""Alle effecten van Freaking RPG, gegenereerd met code. Elke functie krijgt een rng en geeft een float32-array (mono, SR).
Varianten per setting heten `naam__setting` en staan in VARIANTS."""
import numpy as np

from dsp import (SR, adsr_swell, bp, chirp, echo, env, finish, formant, hp, lp, lp_sweep, noise, place, reverb,
                 saw, slow_env, sweep_noise, t_axis, tone, trim_silence, vib_phase)


# ======================= gevecht =======================

def sword_swing(rng):
    d = 0.5
    t = t_axis(d)
    w = sweep_noise(d, 500, 3200, rng, 0.9)
    return finish(w * adsr_swell(t, d, 0.45, 1.5), fade_out=0.08)


def sword_swing_scifi(rng):
    d = 0.8
    t = t_axis(d)
    bell = adsr_swell(t, d, 0.4, 1.2)
    f = 105 * (1 + 0.55 * bell)
    ph = 2 * np.pi * np.cumsum(f) / SR
    hum = lp((2 * ((ph / (2 * np.pi)) % 1) - 1) + 0.5 * np.sin(2 * ph), 1800)
    buzz = bp(noise(len(t), rng), 800, 2400) * (0.6 + 0.4 * np.sin(2 * np.pi * 110 * t))
    return finish((hum + 0.4 * buzz) * bell, fade_out=0.15)


def sword_hit(rng):
    d = 0.7
    t = t_axis(d)
    x = np.zeros(len(t))
    for f, a, dec in [(1750, 1.0, 0.22), (2930, 0.7, 0.16), (4310, 0.45, 0.10), (6120, 0.3, 0.07)]:
        x += a * np.sin(2 * np.pi * f * t) * env(t, dec, 0.0008)
    click = hp(noise(len(t), rng), 2500) * env(t, 0.012, 0.0004)
    thump = np.sin(2 * np.pi * 110 * t) * env(t, 0.05, 0.001)
    return finish(x * 0.6 + click * 0.8 + thump * 0.6, fade_out=0.08)


def sword_hit_scifi(rng):
    d = 0.7
    t = t_axis(d)
    zap = chirp(t, 3200, 180, "saw") * env(t, 0.12, 0.001)
    sizzle = hp(noise(len(t), rng), 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 130 * t)) * env(t, 0.25, 0.001)
    hum = (np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 440 * t)) * env(t, 0.3, 0.002)
    return finish(zap * 0.7 + sizzle * 0.5 + hum * 0.5, fade_out=0.1)


def hit(rng):
    d = 0.28
    t = t_axis(d)
    thump = np.sin(2 * np.pi * (160 * np.exp(-t * 18) + 55) * t) * env(t, 0.07, 0.001)
    click = lp(hp(noise(len(t), rng), 1200), 7000) * env(t, 0.025, 0.0005)
    return finish(thump * 1.2 + click * 0.8, fade_out=0.06)


def punch(rng):
    d = 0.4
    t = t_axis(d)
    body = lp(noise(len(t), rng), 800, 2) * env(t, 0.07, 0.001)
    sub = np.sin(2 * np.pi * (110 * np.exp(-t * 20) + 60) * t) * env(t, 0.13, 0.001)
    crack = hp(noise(len(t), rng), 2500) * env(t, 0.012, 0.0004)
    return finish(body * 0.9 + sub * 1.2 + crack * 0.4, fade_out=0.08)


def punch_superhelden(rng):
    d = 1.3
    t = t_axis(d)
    sub = np.sin(2 * np.pi * (90 * np.exp(-t * 9) + 38) * t) * env(t, 0.45, 0.001)
    shock = lp_sweep(noise(len(t), rng), 5000, 200) * env(t, 0.25, 0.0008)
    crack = hp(noise(len(t), rng), 2000) * env(t, 0.02, 0.0004)
    x = sub * 1.3 + shock + crack * 0.6
    return finish(reverb(x, rng, 0.9, 0.3), fade_out=0.2)


def shield_block(rng):
    d = 0.9
    t = t_axis(d)
    x = np.zeros(len(t))
    for f, a, dec in [(520, 1.0, 0.35), (790, 0.8, 0.28), (1380, 0.5, 0.2), (2100, 0.35, 0.12)]:
        x += a * np.sin(2 * np.pi * f * t) * env(t, dec, 0.0007)
    thump = np.sin(2 * np.pi * 90 * t) * env(t, 0.06, 0.001)
    click = hp(noise(len(t), rng), 2000) * env(t, 0.01, 0.0003)
    return finish(x * 0.55 + thump * 0.9 + click * 0.5, fade_out=0.12)


def arrow(rng):
    d = 0.8
    t = t_axis(d)
    x = np.zeros(len(t))
    f = 196 * (1 + 0.04 * np.exp(-t * 25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    twang = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * env(t, 0.18, 0.001)
    x += twang * 0.7
    tw = t_axis(0.3)
    whoosh = sweep_noise(0.3, 3500, 1500, rng, 0.5) * adsr_swell(tw, 0.3, 0.3, 1.2)
    place(x, whoosh, 0.03, 0.5)
    ts = t_axis(0.12)
    thunk = (np.sin(2 * np.pi * 140 * ts) * env(ts, 0.04, 0.0008) + bp(noise(len(ts), rng), 400, 1200) * env(ts, 0.02, 0.0005))
    place(x, thunk, 0.38, 1.0)
    return finish(x, fade_out=0.1)


def _gun_core(rng, boom_cut=500, boom_dec=0.12, sub=1.0, crack=1.0):
    t = t_axis(0.5)
    cr = hp(noise(len(t), rng), 1500) * env(t, 0.012, 0.0003) * crack
    boom = lp(noise(len(t), rng), boom_cut) * env(t, boom_dec, 0.0008)
    sb = np.sin(2 * np.pi * (90 * np.exp(-t * 15) + 45) * t) * env(t, 0.1, 0.001) * sub
    return cr * 1.0 + boom * 1.1 + sb


def gunshot(rng):
    x = _gun_core(rng)
    return finish(trim_silence(reverb(x, rng, 0.8, 0.35, tail=0.5)), fade_out=0.2)


def gunshot_modern(rng):
    x = _gun_core(rng, 600, 0.09, 0.8, 1.2)
    return finish(trim_silence(reverb(x, rng, 0.3, 0.2, tail=0.2)), fade_out=0.1)


def gunshot_noir(rng):
    x = _gun_core(rng, 700, 0.1, 0.9, 1.1)
    return finish(trim_silence(reverb(echo(x, 0.19, 0.4, 2), rng, 0.6, 0.25, tail=0.4)), fade_out=0.2)


def gunshot_apocalyps(rng):
    x = _gun_core(rng, 400, 0.18, 1.3, 1.0)
    return finish(trim_silence(reverb(echo(x, 0.38, 0.45, 3), rng, 1.6, 0.4, tail=1.0)), fade_out=0.4)


def gunshot_scifi(rng):
    d = 0.5
    t = t_axis(d)
    z = chirp(t, 2000, 200, "saw") * env(t, 0.1, 0.001) + chirp(t, 1800, 220) * env(t, 0.16, 0.001)
    fizz = hp(noise(len(t), rng), 4000) * env(t, 0.03, 0.0005)
    return finish(lp(z, 6000) + fizz * 0.4, fade_out=0.1)


def laser(rng):
    d = 0.4
    t = t_axis(d)
    main = lp(chirp(t, 2400, 260, "saw") * 0.5 + chirp(t, 2400, 260) * 0.7, 5000)
    zap = hp(noise(len(t), rng), 4000) * env(t, 0.02) * 0.4
    return finish(main * env(t, 0.18, 0.002) + zap)


def explosion(rng):
    d = 2.0
    t = t_axis(d)
    n = noise(len(t), rng)
    blast = lp_sweep(n, 6000, 120, 50) * env(t, 0.55, 0.002)
    sub = np.sin(2 * np.pi * (70 * np.exp(-t * 2.2) + 28) * t) * env(t, 0.5, 0.003)
    crack = hp(n, 2500) * env(t, 0.03, 0.001) * 0.6
    return finish(blast + sub * 1.3 + crack, fade_out=0.2)


def explosion_superhelden(rng):
    d = 2.6
    t = t_axis(d)
    n = noise(len(t), rng)
    blast = lp_sweep(n, 8000, 90, 50) * env(t, 0.8, 0.002)
    sub = np.sin(2 * np.pi * (60 * np.exp(-t * 1.6) + 24) * t) * env(t, 0.9, 0.003)
    shock = hp(n, 1200) * env(t, 0.08, 0.001)
    return finish(reverb(blast + sub * 1.4 + shock * 0.7, rng, 1.4, 0.3, tail=0.6), fade_out=0.4)


def explosion_scifi(rng):
    d = 1.8
    t = t_axis(d)
    drop = np.sin(chirp(t, 160, 28) * 0 + 2 * np.pi * np.cumsum(160 * np.exp(-t * 1.7) + 26) / SR) * env(t, 0.7, 0.002)
    fizz = hp(noise(len(t), rng), 3500) * env(t, 0.45, 0.001) * (0.6 + 0.4 * np.sin(2 * np.pi * 45 * t))
    blast = lp_sweep(noise(len(t), rng), 4000, 150, 40) * env(t, 0.35, 0.001)
    return finish(drop * 1.2 + fizz * 0.5 + blast, fade_out=0.3)


def explosion_apocalyps(rng):
    d = 3.2
    t = t_axis(d)
    n = noise(len(t), rng)
    boom = lp_sweep(n, 700, 70, 40) * env(t, 0.9, 0.05)
    sub = np.sin(2 * np.pi * (55 * np.exp(-t * 1.2) + 26) * t) * env(t, 1.0, 0.06)
    x = np.zeros(len(t))
    place(x, boom + sub * 1.2, 0.25, 1.0)
    return finish(reverb(x, rng, 2.0, 0.45, tail=0.5), fade_out=0.6)


def fireball(rng):
    d = 1.3
    t = t_axis(d)
    whoosh = sweep_noise(d, 300, 2500, rng, 0.8)
    swell = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.7)
    crackle = lp(hp(noise(len(t), rng), 3000) * (rng.random(len(t)) > 0.985), 6000) * 4
    rumble = lp(noise(len(t), rng), 180) * 1.5
    return finish(whoosh * swell + 0.5 * rumble * env(t, 0.6) + 0.35 * crackle * swell)


def fireball_superhelden(rng):
    d = 1.3
    t = t_axis(d)
    rise = chirp(t, 180, 950, "saw") * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * t))
    rise = lp(rise, 3000) * adsr_swell(t, d, 0.7, 1.2)
    air = sweep_noise(d, 400, 4000, rng, 0.8) * adsr_swell(t, d, 0.7, 1.0)
    burst = lp_sweep(noise(len(t), rng), 5000, 200) * env(np.clip(t - 0.9, 0, None) + 0.0, 0.18, 0.003) * (t > 0.9)
    return finish(rise * 0.8 + air * 0.5 + burst, fade_out=0.15)


def lightning(rng):
    d = 1.7
    t = t_axis(d)
    n = noise(len(t), rng)
    crack = hp(n, 800) * env(t, 0.06, 0.0005)
    sizzle = hp(n, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 60 * t)) * env(t, 0.35, 0.002)
    rumble = lp_sweep(n, 900, 80, 40) * env(np.clip(t - 0.05, 0, None), 0.7, 0.05)
    return finish(crack + sizzle * 0.5 + rumble * 1.1, fade_out=0.3)


def lightning_superhelden(rng):
    d = 0.9
    t = t_axis(d)
    n = noise(len(t), rng)
    buzz = lp(saw(t, 60) * np.sign(np.sin(2 * np.pi * 14 * t)), 2500) * env(t, 0.3, 0.001)
    crack = hp(n, 1500) * env(t, 0.04, 0.0004)
    zap = chirp(t, 3500, 300, "saw") * env(t, 0.1, 0.001)
    return finish(buzz * 0.7 + crack + zap * 0.5, fade_out=0.15)


def ice_magic(rng):
    d = 1.4
    t = t_axis(d)
    x = np.zeros(len(t))
    for _ in range(14):
        f = 2000 + rng.random() * 4500
        s = rng.random() * 0.7
        ts = t_axis(0.5)
        x_ = (np.sin(2 * np.pi * f * ts) + 0.4 * np.sin(2 * np.pi * f * 2.7 * ts)) * env(ts, 0.1, 0.001)
        place(x, x_, s, 0.4 + 0.6 * rng.random())
    gl = chirp(t, 700, 3200) * env(t, 0.5, 0.01) * 0.35
    shimmer = hp(noise(len(t), rng), 6000) * env(t, 0.5, 0.01) * 0.1
    return finish(x + gl + shimmer, fade_out=0.2)


def magic_ping(rng):
    d = 1.2
    t = t_axis(d)
    base = 880
    parts = [(1, 1.0, 0.45), (2.76, 0.5, 0.25), (5.4, 0.25, 0.15), (1.5, 0.35, 0.3)]
    x = sum(a * np.sin(2 * np.pi * base * r * t) * env(t, dec) for r, a, dec in parts)
    shimmer = 1 + 0.15 * np.sin(2 * np.pi * 9 * t)
    sparkle = hp(noise(len(t), rng), 6000) * env(t, 0.08) * 0.15
    return finish(x * shimmer + sparkle)


def magic_ping_superhelden(rng):
    d = 0.9
    t = t_axis(d)
    pulse = np.sin(chirp(t, 220, 880) * 0 + 2 * np.pi * np.cumsum(220 + 700 * (1 - np.exp(-t * 14))) / SR)
    pulse = (pulse + 0.4 * np.sin(2 * np.pi * np.cumsum(440 + 1400 * (1 - np.exp(-t * 14))) / SR)) * env(t, 0.3, 0.002)
    thump = np.sin(2 * np.pi * 70 * t) * env(t, 0.15, 0.003)
    return finish(pulse + thump * 0.9)


def magic_ping_scifi(rng):
    d = 0.5
    t = t_axis(d)
    x = np.zeros(len(t))
    for i, f in enumerate([1200, 1800, 1500]):
        ts = t_axis(0.09)
        b = np.sign(np.sin(2 * np.pi * f * ts)) * 0.5 + np.sin(2 * np.pi * f * ts)
        place(x, lp(b, 5000) * env(ts, 0.04, 0.001), 0.0 + i * 0.1, 1.0)
    return finish(x, fade_out=0.08)


def summon(rng):
    d = 2.0
    t = t_axis(d)
    rise = lp(chirp(t, 70, 420, "saw"), 1800) * adsr_swell(t, d, 0.8, 1.3)
    air = sweep_noise(d, 250, 3500, rng, 0.8) * adsr_swell(t, d, 0.8, 1.2) * 0.5
    x = rise + air
    ts = t_axis(0.9)
    chime = (np.sin(2 * np.pi * 660 * ts) + 0.5 * np.sin(2 * np.pi * 990 * ts) + 0.3 * np.sin(2 * np.pi * 1760 * ts)) * env(ts, 0.35, 0.003)
    place(x, chime, 1.25, 0.9)
    return finish(x, fade_out=0.3)


# ======================= wereld =======================

def _step(rng, kind="stone", n_len=0.16, pitch=95.0):
    n = int(SR * n_len)
    tt = np.arange(n) / SR
    g = 0.85 + 0.15 * rng.random()
    if kind == "heel":
        click = hp(noise(n, rng), 1800) * env(tt, 0.012, 0.0003)
        ring = np.sin(2 * np.pi * (1700 + 200 * rng.random()) * tt) * env(tt, 0.02, 0.0003) * 0.5
        thud = np.sin(2 * np.pi * 120 * tt) * env(tt, 0.03, 0.001) * 0.6
        return g * (click * 1.0 + ring + thud)
    if kind == "metal":
        step = lp(noise(n, rng), 1500) * env(tt, 0.04, 0.002)
        ring = (np.sin(2 * np.pi * 820 * tt) + 0.6 * np.sin(2 * np.pi * 1730 * tt)) * env(tt, 0.07, 0.001) * 0.35
        thud = np.sin(2 * np.pi * 100 * tt) * env(tt, 0.05, 0.002)
        return g * (step + ring + thud * 0.8)
    if kind == "gravel":
        grit = np.zeros(n)
        for _ in range(26):
            s = int(rng.random() * n * 0.7)
            m = int(SR * 0.006)
            if s + m < n:
                grit[s:s + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (SR * 0.0015))
        grit = lp(grit, 5000) * env(tt, 0.06, 0.001) * 2.0
        thud = np.sin(2 * np.pi * pitch * tt) * env(tt, 0.05, 0.002) * 0.7
        return g * (grit + thud)
    step = lp(noise(n, rng), 900 + 300 * rng.random(), 2) * env(tt, 0.045, 0.002)
    thud = np.sin(2 * np.pi * pitch * tt) * env(tt, 0.05, 0.002)
    return g * (step * 1.2 + thud * 0.8)


def _steps(rng, kind, times, tail=0.0, pitch=95.0):
    d = times[-1] + 0.3 + tail
    x = np.zeros(int(SR * d))
    for st in times:
        place(x, _step(rng, kind, pitch=pitch), st)
    return x


def footsteps(rng):
    return finish(_steps(rng, "stone", [0.05, 0.43, 0.80, 1.17]), fade_out=0.1)


def footsteps_scifi(rng):
    return finish(_steps(rng, "metal", [0.05, 0.42, 0.79, 1.16]), fade_out=0.1)


def footsteps_horror(rng):
    x = _steps(rng, "stone", [0.05, 0.7, 1.4, 2.1], tail=0.0, pitch=80.0)
    return finish(trim_silence(reverb(x, rng, 1.2, 0.35), -45), fade_out=0.4)


def footsteps_apocalyps(rng):
    return finish(_steps(rng, "gravel", [0.05, 0.46, 0.88, 1.3], pitch=85.0), fade_out=0.1)


def footsteps_noir(rng):
    x = _steps(rng, "heel", [0.05, 0.36, 0.67, 0.98, 1.29])
    return finish(reverb(x, rng, 0.5, 0.2, tail=0.2), fade_out=0.2)


def footsteps_modern(rng):
    return finish(_steps(rng, "stone", [0.05, 0.4, 0.75, 1.1], pitch=110.0), fade_out=0.1)


def door_creak(rng):
    d = 1.4
    t = t_axis(d)
    glide = 150 + 110 * (t / d) + 25 * np.sin(2 * np.pi * 6 * t) + 240 * lp(noise(len(t), rng), 8)
    ph = 2 * np.pi * np.cumsum(glide) / SR
    body = bp(2 * ((ph / (2 * np.pi)) % 1) - 1, 350, 1800)
    jitter = 0.6 + 0.4 * np.clip(lp(noise(len(t), rng), 25) * 12, -1, 1)
    return finish(body * jitter * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8, fade_in=0.02, fade_out=0.1)


def door_creak_horror(rng):
    d = 2.4
    t = t_axis(d)
    glide = 95 + 75 * (t / d) ** 1.4 + 10 * np.sin(2 * np.pi * 3.5 * t) + 150 * lp(noise(len(t), rng), 5)
    ph = 2 * np.pi * np.cumsum(glide) / SR
    body = bp(2 * ((ph / (2 * np.pi)) % 1) - 1, 250, 1400)
    jitter = 0.5 + 0.5 * np.clip(lp(noise(len(t), rng), 18) * 12, -1, 1)
    x = body * jitter * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return finish(reverb(x, rng, 1.2, 0.3, tail=0.5), fade_in=0.05, fade_out=0.3)


def door_creak_scifi(rng):
    d = 1.0
    t = t_axis(d)
    hiss = sweep_noise(0.6, 4000, 800, rng, 0.7) * adsr_swell(t_axis(0.6), 0.6, 0.15, 1.2)
    x = np.zeros(len(t))
    place(x, hiss, 0.0, 1.0)
    ts = t_axis(0.45)
    servo = lp(chirp(ts, 400, 950, "saw"), 2200) * adsr_swell(ts, 0.45, 0.5, 1.0)
    place(x, servo, 0.1, 0.55)
    tk = t_axis(0.2)
    clunk = np.sin(2 * np.pi * 110 * tk) * env(tk, 0.06, 0.001) + hp(noise(len(tk), rng), 1500) * env(tk, 0.01, 0.0003) * 0.5
    place(x, clunk, 0.62, 0.9)
    return finish(x, fade_out=0.15)


def _slam(rng, wood=1.0, rattle=1.0):
    d = 0.9
    t = t_axis(d)
    thud = np.sin(2 * np.pi * (120 * np.exp(-t * 14) + 55) * t) * env(t, 0.12, 0.001)
    body = lp(noise(len(t), rng), 700) * env(t, 0.09, 0.0007) * wood
    rat = bp(noise(len(t), rng), 1500, 4500) * env(t, 0.12, 0.003) * (0.5 + 0.5 * np.sin(2 * np.pi * 45 * t)) * rattle
    return thud * 1.2 + body + rat * 0.4


def door_slam(rng):
    return finish(reverb(_slam(rng), rng, 0.7, 0.3, tail=0.3), fade_out=0.2)


def door_slam_scifi(rng):
    t = t_axis(0.9)
    metal = sum(a * np.sin(2 * np.pi * f * t) * env(t, dec, 0.0007) for f, a, dec in [(340, 1, 0.3), (610, 0.7, 0.25), (1180, 0.4, 0.16)])
    x = _slam(rng, 0.3, 0.3)[: len(t)] + metal * 0.4
    return finish(reverb(x, rng, 0.8, 0.3, tail=0.3), fade_out=0.25)


def door_slam_noir(rng):
    return finish(reverb(_slam(rng, 1.2, 0.6), rng, 0.5, 0.22, tail=0.2), fade_out=0.2)


def door_slam_modern(rng):
    d = 0.7
    t = t_axis(d)
    x = _slam(rng, 0.8, 0.4)[: len(t)]
    tk = t_axis(0.05)
    latch = hp(noise(len(tk), rng), 2500) * env(tk, 0.008, 0.0003)
    place(x, latch, 0.16, 0.8)
    return finish(x, fade_out=0.15)


def chest_open(rng):
    d = 1.3
    t = t_axis(d)
    glide = 130 + 90 * np.clip(t / 0.6, 0, 1)
    ph = 2 * np.pi * np.cumsum(glide) / SR
    creak = bp(2 * ((ph / (2 * np.pi)) % 1) - 1, 300, 1500) * np.clip(1 - t / 0.65, 0, 1) * (0.6 + 0.4 * np.clip(lp(noise(len(t), rng), 22) * 12, -1, 1))
    x = creak * 0.7
    tk = t_axis(0.1)
    place(x, hp(noise(len(tk), rng), 2500) * env(tk, 0.012, 0.0003) + np.sin(2 * np.pi * 900 * tk) * env(tk, 0.03, 0.0005) * 0.4, 0.62, 0.9)
    ts = t_axis(0.7)
    sparkle = (np.sin(2 * np.pi * 1760 * ts) + 0.5 * np.sin(2 * np.pi * 2637 * ts)) * env(ts, 0.25, 0.01)
    place(x, sparkle, 0.72, 0.35)
    return finish(x, fade_out=0.2)


def lock_click(rng):
    d = 0.35
    x = np.zeros(int(SR * d))
    for s, f in [(0.02, 1900), (0.17, 1500)]:
        tk = t_axis(0.08)
        c = hp(noise(len(tk), rng), 2500) * env(tk, 0.006, 0.0002) + np.sin(2 * np.pi * f * tk) * env(tk, 0.025, 0.0003) * 0.6
        place(x, c, s, 1.0)
    return finish(x, fade_out=0.06)


def glass_break(rng):
    d = 1.3
    t = t_axis(d)
    crash = hp(noise(len(t), rng), 2500) * env(t, 0.08, 0.0005)
    x = crash.copy()
    for _ in range(45):
        f = 2500 + rng.random() * 5500
        s = 0.02 + rng.random() * 0.9 * rng.random()
        ts = t_axis(0.18)
        place(x, np.sin(2 * np.pi * f * ts) * env(ts, 0.03, 0.0004), s, 0.15 + 0.35 * rng.random())
    return finish(x, fade_out=0.25)


def water_splash(rng):
    d = 1.0
    t = t_axis(d)
    body = bp(noise(len(t), rng), 500, 4500) * env(t, 0.22, 0.004)
    x = body.copy()
    for i in range(14):
        f0 = 500 + rng.random() * 700
        s = 0.03 + rng.random() * 0.6
        ts = t_axis(0.1)
        b = np.sin(2 * np.pi * f0 * (1 + 3 * ts / 0.1 * 0.5) * ts) * env(ts, 0.03, 0.001)
        place(x, b, s, 0.15 + 0.25 * rng.random())
    return finish(x, fade_out=0.2)


def climb(rng):
    d = 1.3
    x = np.zeros(int(SR * d))
    for i, s in enumerate([0.05, 0.45, 0.85]):
        n = t_axis(0.3)
        scr = bp(noise(len(n), rng), 700, 3500) * adsr_swell(n, 0.3, 0.3, 1.2) * 0.6
        place(x, scr, s, 1.0)
        tk = t_axis(0.12)
        place(x, np.sin(2 * np.pi * 100 * tk) * env(tk, 0.04, 0.001) + lp(noise(len(tk), rng), 700) * env(tk, 0.03) * 0.5, s + 0.22, 0.8)
    return finish(x, fade_out=0.15)


def fall(rng):
    d = 1.3
    t = t_axis(d)
    x = np.sin(2 * np.pi * np.cumsum(1500 * np.exp(-t * 1.8) + 250) / SR) * 0.4 * np.clip(1 - np.clip(t - 0.8, 0, None) / 0.1, 0, 1) * (t < 0.9)
    air = sweep_noise(d, 500, 2500, rng, 0.8)[: len(t)] * (t < 0.9) * 0.25
    ti = t_axis(0.4)
    thud = np.sin(2 * np.pi * (100 * np.exp(-ti * 12) + 50) * ti) * env(ti, 0.12, 0.001) + lp(noise(len(ti), rng), 600) * env(ti, 0.05) * 0.6
    place(x, thud, 0.88, 1.6)
    return finish(x + air, fade_out=0.15)


def coin(rng):
    d = 0.6
    t = t_axis(d)
    x = np.zeros(len(t))
    for s, f in [(0.0, 2600), (0.07, 3500)]:
        ts = t_axis(0.5)
        c = (np.sin(2 * np.pi * f * ts) + 0.4 * np.sin(2 * np.pi * f * 2.3 * ts)) * env(ts, 0.12, 0.0006)
        place(x, c, s, 1.0)
    return finish(x, fade_out=0.1)


def item_pickup(rng):
    d = 0.5
    t = t_axis(d)
    a = np.sin(2 * np.pi * 988 * t) * env(t, 0.12, 0.003)
    s = int(SR * 0.09)
    t2 = t[: len(t) - s]
    x = a.copy()
    x[s:] += np.sin(2 * np.pi * 1319 * t2) * env(t2, 0.2, 0.003) * 1.1
    return finish(x + hp(noise(len(t), rng), 7000) * env(t, 0.06) * 0.08, fade_out=0.1)


# ======================= status =======================

def damage_taken(rng):
    d = 0.5
    t = t_axis(d)
    thud = np.sin(2 * np.pi * (140 * np.exp(-t * 12) + 55) * t) * env(t, 0.1, 0.001)
    body = lp(noise(len(t), rng), 600) * env(t, 0.08, 0.001)
    dull = np.sin(2 * np.pi * np.cumsum(420 * np.exp(-t * 4) + 140) / SR) * env(t, 0.22, 0.01) * 0.35
    return finish(thud * 1.2 + body * 0.8 + dull, fade_out=0.1)


def heal(rng):
    notes = [523.25, 659.25, 783.99, 1046.5]
    d = 1.5
    t = t_axis(d)
    x = np.zeros(len(t))
    for i, f in enumerate(notes):
        place(x, (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env(t, 0.35, 0.01), 0.11 * i)
    glow = lp(noise(len(t), rng), 2500) * 0.02 * np.sin(np.pi * np.clip(t / d, 0, 1))
    return finish(x + glow, fade_out=0.15)


def death_sting(rng):
    d = 1.8
    t = t_axis(d)
    x = np.zeros(len(t))
    for f, st in [(329.63, 0.0), (277.18, 0.35), (220.0, 0.7), (164.81, 1.05)]:
        place(x, (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.005 * t)) * env(t, 0.5, 0.02), st, 0.7)
    drone = np.sin(2 * np.pi * 55 * t) * env(t, 1.2, 0.05) * 0.8
    return finish(lp(x, 2500) + drone, fade_out=0.3)


def danger_sting(rng):
    d = 1.3
    t = t_axis(d)
    a = lp(saw(t, 98) + saw(t, 103.5), 1200) * env(t, 0.9, 0.01)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)
    rise = bp(noise(len(t), rng), 1000, 4000) * np.clip(t / d, 0, 1) ** 2 * 0.25
    hit_ = np.sin(2 * np.pi * (90 * np.exp(-t * 12) + 40) * t) * env(t, 0.2, 0.001)
    return finish(a * trem * 0.9 + rise + hit_ * 0.9, fade_out=0.25)


def danger_sting_horror(rng):
    d = 1.6
    t = t_axis(d)
    ph = vib_phase(t, 860 + 500 * np.clip(t / d, 0, 1), 0.012, 6.5)
    v = (2 * ((ph / (2 * np.pi)) % 1) - 1)
    v = lp(v, 4500) * env(t, 1.1, 0.04)
    low = np.sin(2 * np.pi * 48 * t) * env(t, 1.2, 0.02) * 0.8
    scr = hp(noise(len(t), rng), 3000) * env(t, 0.5, 0.01) * 0.12
    return finish(v * 0.6 + low + scr, fade_out=0.3)


def discovery_sting(rng):
    d = 1.6
    t = t_axis(d)
    x = np.zeros(len(t))
    for i, f in enumerate([392.0, 493.88, 587.33, 739.99, 987.77]):
        place(x, (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * env(t, 0.5, 0.01), 0.13 * i, 0.9)
    shim = hp(noise(len(t), rng), 6000) * env(t, 0.7, 0.01) * 0.05
    return finish(reverb(x + shim, rng, 0.9, 0.3, tail=0.3), fade_out=0.3)


def victory(rng):
    d = 2.2
    t = t_axis(d)
    x = np.zeros(len(t))
    chords = [(0.0, [261.63, 329.63, 392.0], 0.35), (0.32, [293.66, 349.23, 440.0], 0.35), (0.64, [329.63, 392.0, 523.25], 0.9)]
    for st, fs, ln in chords:
        for f in fs:
            ts = t_axis(ln + 0.5)
            note = lp(saw(ts, f) + 0.6 * saw(ts, f * 1.003), 2600) * np.clip(ts / 0.03, 0, 1) * np.exp(-np.clip(ts - ln, 0, None) / 0.18) * np.exp(-ts / 1.4)
            place(x, note, st, 0.35)
    return finish(reverb(x, rng, 1.0, 0.25, tail=0.4), fade_out=0.35)


def power_up(rng):
    d = 1.3
    t = t_axis(d)
    x = np.zeros(len(t))
    for i, f in enumerate([261.63, 329.63, 392.0, 523.25, 659.25, 784.0, 1046.5]):
        place(x, (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env(t, 0.3, 0.005), 0.07 * i, 0.8)
    sweep = chirp(t, 200, 1600) * np.clip(1 - t / 0.7, 0, 1) * 0.2
    sparkle = hp(noise(len(t), rng), 6000) * env(np.clip(t - 0.4, 0, None), 0.4) * 0.07 * (t > 0.4)
    return finish(x + sweep + sparkle, fade_out=0.2)


def quest_done(rng):
    d = 0.9
    t = t_axis(d)
    x = np.zeros(len(t))
    for s, f in [(0.0, 784.0), (0.14, 1174.7)]:
        place(x, (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * env(t, 0.35, 0.004), s)
    return finish(x, fade_out=0.15)


# ======================= wezens =======================

def wolf_howl(rng):
    d = 2.4
    t = t_axis(d)
    glide = 380 + 260 * np.sin(np.pi * np.clip(t / 1.2, 0, 1)) * (t < 1.2) + 40 * np.clip((t - 1.2) / 1.2, 0, 1) * -1
    glide = np.where(t < 1.2, 380 + 260 * np.sin(np.pi / 2 * t / 1.2), 640 - 220 * (np.clip(t - 1.2, 0, None) / 1.2) ** 1.2)
    glide = glide * (1 + 0.015 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.6, 0, 1))
    ph = 2 * np.pi * np.cumsum(glide) / SR
    v = np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.15 * np.sin(4 * ph)
    breath = bp(noise(len(t), rng), 900, 3000) * 0.07
    a = adsr_swell(t, d, 0.5, 0.8)
    return finish(reverb((v + breath) * a, rng, 1.2, 0.3, tail=0.4), fade_in=0.1, fade_out=0.4)


def dragon_roar(rng):
    d = 2.8
    t = t_axis(d)
    f = 85 * (1 + 0.5 * np.sin(np.pi * np.clip(t / d, 0, 1)) - 0.3 * (t / d))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = (2 * ((ph / (2 * np.pi)) % 1) - 1) * (0.55 + 0.45 * np.sin(2 * np.pi * 26 * t))
    voc = formant(src + 0.5 * noise(len(t), rng) * 0.4, [(300, 200, 1.0), (800, 300, 0.8), (1500, 500, 0.4)])
    n = hp(noise(len(t), rng), 1800) * 0.06
    a = adsr_swell(t, d, 0.3, 0.9)
    return finish(reverb((voc + n) * a, rng, 1.6, 0.3, tail=0.6), fade_in=0.05, fade_out=0.5)


def _growl(rng, d=1.5, f0=58, formants=((250, 150, 1.0), (700, 300, 0.7), (1400, 400, 0.3)), wet=False):
    t = t_axis(d)
    f = f0 * (1 - 0.18 * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = (2 * ((ph / (2 * np.pi)) % 1) - 1) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t))
    voc = formant(src, list(formants))
    breath = bp(noise(len(t), rng), 300, 1500) * 0.15
    x = (voc + breath) * adsr_swell(t, d, 0.25, 0.8)
    if wet:
        x = reverb(x, rng, 1.4, 0.35, tail=0.5)
    return finish(x, fade_in=0.04, fade_out=0.3)


def monster_growl(rng):
    return _growl(rng)


def monster_growl_horror(rng):
    return _growl(rng, 2.0, 42, ((200, 120, 1.0), (520, 240, 0.7), (1100, 300, 0.35)), wet=True)


def horror_whisper(rng):
    d = 2.2
    t = t_axis(d)
    src = noise(len(t), rng)
    vowels = [(500, 700), (900, 1700), (2300, 2900)]
    out = np.zeros(len(t))
    for lo, hi in vowels:
        out += bp(src, lo, hi, 2) * slow_env(len(t), rng, 5.0, 1.0) ** 2
    out *= adsr_swell(t, d, 0.4, 0.8)
    out += hp(src, 5000) * slow_env(len(t), rng, 6.0, 1.0) ** 3 * 0.12 * adsr_swell(t, d, 0.4, 0.8)
    return finish(reverb(out, rng, 1.1, 0.3, tail=0.3), fade_in=0.1, fade_out=0.4)


def crowd_cheer(rng):
    d = 2.8
    t = t_axis(d)
    out = np.zeros(len(t))
    for v in range(14):
        sh = 0.75 + 0.6 * rng.random()
        src = noise(len(t), rng)
        voice = np.zeros(len(t))
        for lo, hi in [(450, 900), (1100, 1900), (2300, 3200)]:
            voice += bp(src, lo * sh, hi * sh, 2) * slow_env(len(t), rng, 3.0 + 2 * rng.random(), 1.0) ** 2
        out += voice * (0.5 + 0.5 * rng.random())
    swell = adsr_swell(t, d, 0.3, 0.7)
    clap = hp(noise(len(t), rng), 1500) * (rng.random(len(t)) > 0.996) * 4
    clap = lp(clap, 7000) * swell
    return finish(lp(out, 3600) * swell + clap * 0.3, fade_in=0.2, fade_out=0.6)


def laugh(rng):
    d = 1.6
    t = t_axis(d)
    x = np.zeros(len(t))
    f0 = 240.0
    for i in range(5):
        st = 0.1 + i * 0.26
        n = int(SR * 0.19)
        tt = np.arange(n) / SR
        f = (f0 - 14 * i) * (1 + 0.1 * np.exp(-tt * 20))
        ph = 2 * np.pi * np.cumsum(f) / SR
        src = 2 * ((ph / (2 * np.pi)) % 1) - 1
        voc = formant(src, [(750, 200, 1.0), (1100, 250, 0.8), (2500, 400, 0.25)])
        a = np.sin(np.pi * np.clip(tt / 0.19, 0, 1)) ** 0.7 * (1.0 - 0.08 * i)
        place(x, voc * a + bp(noise(n, rng), 3000, 6000) * a * 0.05, st)
    return finish(reverb(x, rng, 0.5, 0.15, tail=0.15), fade_out=0.15)


# ======================= app =======================

def ui_tick(rng):
    d = 0.07
    t = t_axis(d)
    x = np.sin(2 * np.pi * 1800 * t) * env(t, 0.012, 0.0005) + 0.4 * np.sin(2 * np.pi * 3600 * t) * env(t, 0.008, 0.0005)
    return finish(x, peak_db=-8, fade_out=0.015)


def new_turn(rng):
    d = 0.4
    t = t_axis(d)
    sw = sweep_noise(d, 1500, 4500, rng, 0.8)[: len(t)] * adsr_swell(t, d, 0.4, 1.4) * 0.5
    tk = np.sin(2 * np.pi * 1500 * t) * env(t, 0.01, 0.0004) * 0.25
    return finish(sw + tk, peak_db=-9, fade_out=0.1)


def adventure_start(rng):
    d = 2.6
    t = t_axis(d)
    x = np.zeros(len(t))
    for f in [130.81, 196.0, 261.63, 329.63]:
        x += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * adsr_swell(t, d, 0.55, 1.2) * 0.5
    ts = t_axis(1.2)
    chime = (np.sin(2 * np.pi * 784 * ts) + 0.4 * np.sin(2 * np.pi * 1568 * ts)) * env(ts, 0.5, 0.004)
    place(x, chime, 1.1, 0.7)
    return finish(reverb(x, rng, 1.2, 0.25, tail=0.3), fade_in=0.05, fade_out=0.5)


def adventure_end(rng):
    d = 3.0
    t = t_axis(d)
    x = np.zeros(len(t))
    for st, fs in [(0.0, [392.0, 493.88, 587.33]), (0.9, [261.63, 329.63, 392.0, 523.25])]:
        for f in fs:
            place(x, (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * env(t, 1.0, 0.03), st, 0.5)
    bell = (np.sin(2 * np.pi * 523.25 * t) + 0.5 * np.sin(2 * np.pi * 523.25 * 2.76 * t)) * env(t, 0.9, 0.002)
    place(x, bell, 0.9, 0.35)
    return finish(reverb(x, rng, 1.6, 0.3, tail=0.4), fade_in=0.03, fade_out=0.7)


# ======================= register =======================

EFFECTS = {
    "sword_swing": sword_swing, "sword_hit": sword_hit, "hit": hit, "punch": punch, "shield_block": shield_block,
    "arrow": arrow, "gunshot": gunshot, "laser": laser, "explosion": explosion, "fireball": fireball,
    "lightning": lightning, "ice_magic": ice_magic, "magic_ping": magic_ping, "summon": summon,
    "footsteps": footsteps, "door_creak": door_creak, "door_slam": door_slam, "chest_open": chest_open,
    "lock_click": lock_click, "glass_break": glass_break, "water_splash": water_splash, "climb": climb, "fall": fall,
    "wolf_howl": wolf_howl, "dragon_roar": dragon_roar, "monster_growl": monster_growl,
    "horror_whisper": horror_whisper, "crowd_cheer": crowd_cheer, "laugh": laugh,
    "danger_sting": danger_sting, "discovery_sting": discovery_sting, "victory": victory,
    "damage_taken": damage_taken, "heal": heal, "death_sting": death_sting, "power_up": power_up,
    "coin": coin, "item_pickup": item_pickup, "quest_done": quest_done,
    "ui_tick": ui_tick, "new_turn": new_turn, "adventure_start": adventure_start, "adventure_end": adventure_end,
}

VARIANTS = {
    ("punch", "superhelden"): punch_superhelden,
    ("fireball", "superhelden"): fireball_superhelden,
    ("explosion", "superhelden"): explosion_superhelden,
    ("magic_ping", "superhelden"): magic_ping_superhelden,
    ("lightning", "superhelden"): lightning_superhelden,
    ("sword_swing", "scifi"): sword_swing_scifi,
    ("sword_hit", "scifi"): sword_hit_scifi,
    ("gunshot", "scifi"): gunshot_scifi,
    ("magic_ping", "scifi"): magic_ping_scifi,
    ("door_creak", "scifi"): door_creak_scifi,
    ("door_slam", "scifi"): door_slam_scifi,
    ("footsteps", "scifi"): footsteps_scifi,
    ("explosion", "scifi"): explosion_scifi,
    ("footsteps", "horror"): footsteps_horror,
    ("door_creak", "horror"): door_creak_horror,
    ("danger_sting", "horror"): danger_sting_horror,
    ("monster_growl", "horror"): monster_growl_horror,
    ("gunshot", "apocalyps"): gunshot_apocalyps,
    ("explosion", "apocalyps"): explosion_apocalyps,
    ("footsteps", "apocalyps"): footsteps_apocalyps,
    ("gunshot", "noir"): gunshot_noir,
    ("footsteps", "noir"): footsteps_noir,
    ("door_slam", "noir"): door_slam_noir,
    ("gunshot", "modern"): gunshot_modern,
    ("footsteps", "modern"): footsteps_modern,
    ("door_slam", "modern"): door_slam_modern,
}
