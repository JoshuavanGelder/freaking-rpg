"""15 ambience-loops van 20 seconden. Ruisachtig materiaal wordt naadloos gemaakt met een crossfade (zie dsp.crossfade_loop)."""
import numpy as np

from dsp import (SR, bp, chirp, crossfade_loop, echo, env, formant, hp, level_rms, lp, noise, place, reverb, saw,
                 slow_env, t_axis)

D = 20.0
XF = 1.5
N_OUT = int(SR * D)
N = int(SR * (D + XF))
LOOP_RMS = -28.0


def _finish(x):
    return level_rms(crossfade_loop(x, N_OUT, int(SR * XF)), LOOP_RMS)


def _at(rng, lo=0.0, hi=None):
    hi = (D + XF - 0.5) if hi is None else hi
    return lo + rng.random() * (hi - lo)


def _wind(rng, bands, gain=1.0):
    """Wind uit meerdere banden die elk onafhankelijk langzaam harder en zachter worden."""
    out = np.zeros(N)
    for lo, hi, cut, depth, g in bands:
        out += bp(noise(N, rng), lo, hi, 2) * slow_env(N, rng, cut, depth) * g
    return out * gain


def _babble(rng, voices, lo_cut=3.0, top=3400):
    out = np.zeros(N)
    for _ in range(voices):
        sh = 0.75 + 0.5 * rng.random()
        src = noise(N, rng)
        voice = np.zeros(N)
        for lo, hi in [(300, 700), (900, 1500), (1800, 2600)]:
            voice += bp(src, lo * sh, hi * sh, 2) * slow_env(N, rng, lo_cut + 2 * rng.random(), 1.0) ** 2
        out += voice * (0.6 + 0.4 * rng.random())
    return lp(out, top, 2) * slow_env(N, rng, 0.3, 0.35)


def _drip(rng, f=None, dec=0.035):
    f = f if f else 1100 + rng.random() * 900
    m = int(SR * 0.5)
    tt = np.arange(m) / SR
    return np.sin(2 * np.pi * (f * (1 + 0.5 * np.exp(-tt * 40))) * tt) * np.exp(-tt / dec)


def _bird(rng):
    kind = rng.integers(0, 3)
    base = 2200 + rng.random() * 2200
    out = []
    reps = rng.integers(2, 5)
    for _ in range(reps):
        d = 0.07 + 0.1 * rng.random()
        tt = np.arange(int(SR * d)) / SR
        up = base * (1 + 0.5 * np.sin(np.pi * tt / d)) if kind != 1 else base * (1 + 0.6 * tt / d)
        ph = 2 * np.pi * np.cumsum(up) / SR
        c = np.sin(ph) * np.sin(np.pi * tt / d) ** 1.5
        if kind == 2:
            c *= 0.6 + 0.4 * np.sin(2 * np.pi * 38 * tt)
        out.append(c)
        out.append(np.zeros(int(SR * 0.05)))
    return np.concatenate(out)


def _creak(rng, d=0.9, f0=120):
    t = t_axis(d)
    g = f0 + 80 * (t / d) + 150 * lp(noise(len(t), rng), 6)
    ph = 2 * np.pi * np.cumsum(g) / SR
    body = bp(2 * ((ph / (2 * np.pi)) % 1) - 1, 300, 1500)
    jit = 0.5 + 0.5 * np.clip(lp(noise(len(t), rng), 20) * 12, -1, 1)
    return body * jit * np.sin(np.pi * t / d) ** 1.2


def _metal(rng, base=900):
    t = t_axis(0.5)
    return sum(a * np.sin(2 * np.pi * base * r * t) * env(t, dec, 0.0007) for r, a, dec in [(1, 1, 0.18), (1.7, 0.6, 0.12), (2.9, 0.4, 0.08)])


def forest_night(rng):
    t = np.arange(N) / SR
    wind = lp(noise(N, rng), 450, 2) * slow_env(N, rng, 0.25, 0.8) * 0.6
    leaves = bp(noise(N, rng), 2500, 5500, 2) * slow_env(N, rng, 0.3, 0.9) * 0.05
    crick = np.zeros(N)
    for _ in range(int(D * 1.6)):
        f = 4300 + rng.random() * 500
        m = int(SR * 0.9)
        tt = np.arange(m) / SR
        pulses = rng.integers(3, 6)
        gate = (np.sin(2 * np.pi * 26 * tt) > 0.2) * np.exp(-((tt - 0.1) / 0.7) ** 2) * (tt < 0.12 * pulses)
        place(crick, np.sin(2 * np.pi * f * tt) * gate * 0.06, _at(rng, 0, D + XF - 1))
    owl = np.zeros(N)
    for _ in range(2):
        s = _at(rng, 1, D - 2)
        for i, f in enumerate([392.0, 330.0]):
            tt = t_axis(0.4)
            note = np.sin(2 * np.pi * f * tt * (1 + 0.01 * np.sin(2 * np.pi * 5 * tt))) * np.sin(np.pi * tt / 0.4) ** 1.5
            place(owl, note, s + i * 0.55, 0.08)
    return _finish(wind + leaves + crick + owl)


def forest_day(rng):
    wind = lp(noise(N, rng), 500, 2) * slow_env(N, rng, 0.25, 0.8) * 0.35
    leaves = bp(noise(N, rng), 2000, 6000, 2) * slow_env(N, rng, 0.35, 0.9) * 0.06
    birds = np.zeros(N)
    for _ in range(int(D * 1.3)):
        place(birds, _bird(rng), _at(rng, 0, D + XF - 1.0), 0.04 + 0.1 * rng.random())
    return _finish(wind + leaves + birds * 1.0)


def cave(rng):
    t = np.arange(N) / SR
    drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 55.4 * t) + 0.35 * np.sin(2 * np.pi * 82.4 * t + 1.0)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.1 * t))
    air = lp(noise(N, rng), 220, 2) * slow_env(N, rng, 0.2, 0.6) * 0.8
    drips = np.zeros(N)
    for _ in range(int(D / 3.0)):
        place(drips, _drip(rng), _at(rng, 0, D + XF - 1.0), 0.2)
    drips = reverb(drips, rng, 2.2, 0.65)[:N]
    return _finish(drone * 0.5 + air + drips)


def dungeon(rng):
    t = np.arange(N) / SR
    drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 41.5 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.1 * t))
    air = lp(noise(N, rng), 180, 2) * slow_env(N, rng, 0.15, 0.6) * 0.9
    torch = lp(hp(noise(N, rng), 1500) * (rng.random(N) > 0.9985), 6000) * 3
    torch += hp(noise(N, rng), 3000) * 0.012 * slow_env(N, rng, 0.8, 0.8)
    clinks = np.zeros(N)
    for _ in range(int(D / 6)):
        s = _at(rng, 0, D + XF - 1.0)
        for k in range(rng.integers(2, 5)):
            place(clinks, _metal(rng, 700 + 300 * rng.random()), s + k * (0.09 + 0.05 * rng.random()), 0.018)
    drips = np.zeros(N)
    for _ in range(int(D / 4.5)):
        place(drips, _drip(rng, 900 + 600 * rng.random()), _at(rng, 0, D + XF - 1.0), 0.18)
    moan = _wind(rng, [(120, 320, 0.12, 1.0, 0.5)])
    ambient = reverb(clinks + drips, rng, 1.8, 0.6)[:N]
    return _finish(drone * 0.5 + air + torch + ambient + moan)


def city_rain(rng):
    base = hp(noise(N, rng), 1200, 2) * 0.35
    patter = bp(noise(N, rng), 3500, 9000, 2) * slow_env(N, rng, 0.5, 0.35) * 0.35
    drops = np.zeros(N)
    for i in np.where(rng.random(N) > 0.9992)[0]:
        m = int(SR * 0.012)
        if i + m < N:
            drops[i:i + m] += np.exp(-np.arange(m) / (SR * 0.002)) * rng.standard_normal(m) * 0.5
    rumble = lp(noise(N, rng), 130, 2) * slow_env(N, rng, 0.12, 0.8) * 0.9
    return _finish(base + patter + hp(drops, 2500) * 0.4 + rumble)


def city_day(rng):
    traffic = lp(noise(N, rng), 380, 2) * slow_env(N, rng, 0.15, 0.7) * 1.0
    hum = lp(noise(N, rng), 900, 2) * slow_env(N, rng, 0.2, 0.6) * 0.18
    cars = np.zeros(N)
    for _ in range(int(D / 2.2)):
        d = 0.9 + 1.4 * rng.random()
        tt = t_axis(d)
        sw = bp(noise(len(tt), rng), 200, 900 + 600 * rng.random(), 2) * np.sin(np.pi * tt / d) ** 2
        place(cars, sw, _at(rng, 0, D + XF - 2.0), 0.5 + 0.5 * rng.random())
    horns = np.zeros(N)
    for _ in range(2):
        tt = t_axis(0.35)
        f = 380 + 120 * rng.random()
        h = lp(saw(tt, f) + saw(tt, f * 1.25), 1400) * np.sin(np.pi * tt / 0.35) ** 0.5
        place(horns, h, _at(rng, 1, D - 1), 0.03)
    people = _babble(rng, 4, 3.0, 2600) * 0.12
    return _finish(traffic + hum + cars * 0.25 + horns + people)


def market(rng):
    babble = _babble(rng, 10, 3.0, 3600) * 0.9
    low = lp(noise(N, rng), 160, 2) * slow_env(N, rng, 0.2, 0.5) * 0.4
    clinks = np.zeros(N)
    for _ in range(int(D / 1.6)):
        place(clinks, _metal(rng, 1800 + 1800 * rng.random()), _at(rng), 0.025 + 0.03 * rng.random())
    bells = np.zeros(N)
    for _ in range(3):
        tt = t_axis(1.2)
        f = 1300 + 500 * rng.random()
        b = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt)) * env(tt, 0.4, 0.002)
        place(bells, b, _at(rng, 0, D + XF - 1.5), 0.04)
    return _finish(babble + low + clinks + bells)


def tavern(rng):
    babble = _babble(rng, 9, 3.0, 3400) * 0.7
    fire = lp(hp(noise(N, rng), 1500) * (rng.random(N) > 0.995), 5000) * 3 * 0.25
    low = lp(noise(N, rng), 160, 2) * slow_env(N, rng, 0.2, 0.5) * 0.8
    clinks = np.zeros(N)
    for _ in range(int(D / 4)):
        f = 2300 + rng.random() * 1800
        tt = t_axis(0.4)
        c = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.4 * tt)) * np.exp(-tt / 0.07)
        place(clinks, c, _at(rng, 0, D + XF - 0.6), 0.05)
    return _finish(babble + fire + low + clinks)


def sea_waves(rng):
    t = np.arange(N) / SR
    swell = (0.5 + 0.5 * np.sin(2 * np.pi * t / (D / 3) - 1.2)) ** 1.8
    body = lp(noise(N, rng), 700, 2) * swell * slow_env(N, rng, 0.15, 0.4)
    foam = hp(noise(N, rng), 2500, 2) * np.roll(swell, int(SR * 0.9)) ** 1.5 * 0.35
    low = lp(noise(N, rng), 90, 2) * 0.5
    gulls = np.zeros(N)
    for _ in range(3):
        tt = t_axis(0.5)
        f = 1500 + 400 * np.sin(np.pi * tt / 0.5) - 500 * tt
        ph = 2 * np.pi * np.cumsum(f) / SR
        g = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.sin(np.pi * tt / 0.5) ** 1.2
        place(gulls, g * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * tt)), _at(rng, 1, D - 1), 0.025)
    return _finish(body + foam + low + gulls)


def desert_wind(rng):
    wind = _wind(rng, [(250, 700, 0.18, 1.0, 1.0), (600, 1500, 0.22, 1.0, 0.6), (1400, 3200, 0.3, 1.0, 0.25)])
    sand = hp(noise(N, rng), 3500, 2) * slow_env(N, rng, 0.4, 0.9) * 0.05
    low = lp(noise(N, rng), 90, 2) * slow_env(N, rng, 0.1, 0.5) * 0.5
    return _finish(wind + sand + low)


def snow_wind(rng):
    wind = _wind(rng, [(200, 800, 0.2, 1.0, 1.0), (700, 1800, 0.25, 1.0, 0.8), (1600, 3600, 0.3, 1.0, 0.35)])
    t = np.arange(N) / SR
    whistle = np.sin(2 * np.pi * 1040 * t * (1 + 0.015 * np.sin(2 * np.pi * 0.35 * t))) * slow_env(N, rng, 0.25, 1.0) ** 3 * 0.05
    low = lp(noise(N, rng), 100, 2) * slow_env(N, rng, 0.1, 0.5) * 0.6
    return _finish(wind + whistle + low)


def mountains(rng):
    wind = _wind(rng, [(180, 600, 0.15, 1.0, 1.0), (500, 1400, 0.2, 1.0, 0.35)])
    air = hp(noise(N, rng), 4500, 2) * slow_env(N, rng, 0.3, 0.7) * 0.015
    eagle = np.zeros(N)
    for _ in range(2):
        s = _at(rng, 1, D - 2)
        for i in range(3):
            tt = t_axis(0.45)
            f = 2800 - 900 * (tt / 0.45) ** 0.8
            ph = 2 * np.pi * np.cumsum(f) / SR
            c = (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.sin(np.pi * tt / 0.45) ** 1.3
            place(eagle, c, s + i * 0.6, 0.03)
    eagle = reverb(eagle, rng, 1.8, 0.5)[:N]
    return _finish(wind + air + eagle)


def battlefield(rng):
    rumble = lp(noise(N, rng), 120, 2) * slow_env(N, rng, 0.2, 0.9) * 1.2
    roar = _babble(rng, 7, 2.0, 1300) * 0.35
    wind = _wind(rng, [(200, 700, 0.15, 1.0, 0.5)])
    clash = np.zeros(N)
    for _ in range(int(D / 1.1)):
        place(clash, _metal(rng, 500 + 500 * rng.random()), _at(rng), 0.02 + 0.05 * rng.random())
    clash = reverb(clash, rng, 1.2, 0.5)[:N]
    horn = np.zeros(N)
    tt = t_axis(1.6)
    f = 110 * (1 + 0.32 * np.clip(tt / 0.4, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    h = lp(2 * ((ph / (2 * np.pi)) % 1) - 1, 700) * np.sin(np.pi * tt / 1.6) ** 1.5
    place(horn, reverb(h, rng, 1.5, 0.5)[: len(tt)], _at(rng, 3, D - 3), 0.12)
    return _finish(rumble + roar + wind + clash + horn)


def horror_house(rng):
    t = np.arange(N) / SR
    drone = (np.sin(2 * np.pi * 45 * t) + 0.8 * np.sin(2 * np.pi * 46.2 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.1 * t))
    wind = _wind(rng, [(150, 450, 0.12, 1.0, 0.9), (400, 1000, 0.15, 1.0, 0.3)])
    creaks = np.zeros(N)
    for _ in range(3):
        place(creaks, _creak(rng, 0.8 + 0.8 * rng.random(), 90 + 60 * rng.random()), _at(rng, 0, D - 1), 0.1)
    creaks = reverb(creaks, rng, 1.6, 0.4)[:N]
    ticks = np.zeros(N)
    for i in range(int(D + 2)):
        tk = t_axis(0.04)
        f = 1100 if i % 2 == 0 else 900
        c = (np.sin(2 * np.pi * f * tk) + hp(noise(len(tk), rng), 2000) * 0.5) * env(tk, 0.01, 0.0003)
        place(ticks, c, i * 1.0, 0.035)
    whispers = np.zeros(N)
    for _ in range(2):
        tt = t_axis(1.6)
        src = noise(len(tt), rng)
        w = sum(bp(src, lo, hi, 2) * slow_env(len(tt), rng, 5.0, 1.0) ** 2 for lo, hi in [(500, 700), (900, 1700), (2300, 2900)]) * np.sin(np.pi * tt / 1.6)
        place(whispers, w, _at(rng, 1, D - 2), 0.025)
    return _finish(drone * 0.5 + wind + creaks + ticks + reverb(whispers, rng, 1.5, 0.5)[:N])


def spaceship_hum(rng):
    t = np.arange(N) / SR
    hum = (np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120.4 * t) + 0.3 * np.sin(2 * np.pi * 181 * t) + 0.15 * np.sin(2 * np.pi * 240.9 * t))
    hum = hum * (0.85 + 0.15 * np.sin(2 * np.pi * 0.35 * t))
    air = bp(noise(N, rng), 200, 900, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t)) * 0.3
    blips = np.zeros(N)
    for _ in range(int(D / 5)):
        tt = t_axis(0.09)
        place(blips, np.sin(2 * np.pi * (1400 + rng.random() * 1600) * tt) * np.exp(-tt / 0.03), _at(rng, 0, D + XF - 0.5), 0.05)
    return _finish(hum * 0.5 + air + blips)


AMBIENCE = {
    "forest_night": forest_night, "forest_day": forest_day, "cave": cave, "dungeon": dungeon,
    "city_rain": city_rain, "city_day": city_day, "market": market, "tavern": tavern,
    "sea_waves": sea_waves, "desert_wind": desert_wind, "snow_wind": snow_wind, "mountains": mountains,
    "battlefield": battlefield, "horror_house": horror_house, "spaceship_hum": spaceship_hum,
}
