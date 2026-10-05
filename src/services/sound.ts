// Geluid afspelen: effecten (korte bestanden), een ambience-loop en een muziekloop, elk met eigen volume en crossfade.
// Alles blijft optioneel: gaat er iets mis met afspelen, dan blijft het spel gewoon doorlopen zonder geluid.
import { AppState, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { SOUND_FILES } from '../soundFiles';
import { ambienceFile, moodFile, sfxFile, type Ambience, type Mood, type Sfx } from '../logic/soundTags';
import type { TurnSound } from '../logic/types';

export type SoundLevels = {
  on: boolean; // hoofdschakelaar
  sfx: number; // 0..1
  ambience: number;
  music: number;
  vibrate: boolean; // trillen bij schade
};

export const DEFAULT_LEVELS: SoundLevels = { on: true, sfx: 1, ambience: 0.7, music: 0, vibrate: true };

const SOFT = 0.55; // kleine actie: effecten zachter
const DUCK = 0.45; // ambience en muziek zakken even weg tijdens een effect
const CAUSE_TO_EFFECT_MS = 420; // pauze tussen oorzaak en gevolg
const MAX_POOL = 18;

const dispose = (p: AudioPlayer) => {
  try {
    const any = p as any;
    if (typeof any.release === 'function') any.release();
    else if (typeof any.remove === 'function') any.remove();
  } catch {
    /* niets aan te doen */
  }
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Fading = { player: AudioPlayer; key: string; fade: number; timer: ReturnType<typeof setInterval> | null };

/** Een loopkanaal (ambience of muziek): één geluid tegelijk, bij wisselen een crossfade. */
class LoopBus {
  private current: Fading | null = null;
  private old = new Set<Fading>();
  private level = 0;
  private duck = 1;
  private paused = false;

  constructor(private fadeMs: number) {}

  private apply(f: Fading) {
    try {
      f.player.volume = clamp01(f.fade * this.level * this.duck);
    } catch {
      /* speler is al weg */
    }
  }

  private ramp(f: Fading, to: number, ms: number, done?: () => void) {
    if (f.timer) clearInterval(f.timer);
    const from = f.fade;
    const steps = Math.max(1, Math.round(ms / 80));
    let i = 0;
    f.timer = setInterval(() => {
      i++;
      f.fade = from + (to - from) * Math.min(1, i / steps);
      this.apply(f);
      if (i >= steps) {
        if (f.timer) clearInterval(f.timer);
        f.timer = null;
        done?.();
      }
    }, 80);
  }

  private retire(f: Fading) {
    this.old.add(f);
    this.ramp(f, 0, this.fadeMs, () => {
      try {
        f.player.pause();
      } catch {
        /* weg */
      }
      dispose(f.player);
      this.old.delete(f);
    });
  }

  /** Zet het geluid van dit kanaal (null = stilte). Hetzelfde geluid blijft gewoon doorlopen. */
  set(key: string | null) {
    if (key && this.current?.key === key) {
      if (!this.paused) this.resumeCurrent();
      return;
    }
    if (this.current) {
      this.retire(this.current);
      this.current = null;
    }
    if (!key || this.level <= 0) return;
    const source = SOUND_FILES[key];
    if (source === undefined) return;
    try {
      const player = createAudioPlayer(source);
      player.loop = true;
      const f: Fading = { player, key, fade: 0, timer: null };
      this.apply(f);
      this.current = f;
      if (!this.paused) player.play();
      this.ramp(f, 1, this.fadeMs);
    } catch {
      this.current = null;
    }
  }

  /** Het wensgeluid dat bij de huidige beurt hoort; wordt bewaard zodat een volume van 0 later weer kan opstarten. */
  wanted: string | null = null;

  setLevel(level: number) {
    const was = this.level;
    this.level = clamp01(level);
    if (this.level <= 0) {
      // Uit: loops meteen stoppen (zodat ze geen batterij kosten) en onthouden wat er moet klinken.
      if (this.current) {
        this.retire(this.current);
        this.current = null;
      }
      return;
    }
    if (was <= 0 && !this.current && this.wanted) this.set(this.wanted);
    for (const f of [this.current, ...this.old]) if (f) this.apply(f);
  }

  setDuck(d: number) {
    this.duck = d;
    if (this.current) this.apply(this.current);
  }

  pause() {
    this.paused = true;
    for (const f of [this.current, ...this.old]) {
      try {
        f?.player.pause();
      } catch {
        /* weg */
      }
    }
  }

  private resumeCurrent() {
    try {
      this.current?.player.play();
    } catch {
      /* weg */
    }
  }

  resume() {
    this.paused = false;
    this.resumeCurrent();
  }

  /** Alles uit met een fade (scherm verlaten). */
  stop() {
    this.wanted = null;
    if (this.current) {
      this.retire(this.current);
      this.current = null;
    }
  }
}

class SoundManager {
  private levels: SoundLevels = DEFAULT_LEVELS;
  private oneShots = new Map<string, AudioPlayer>();
  private ambience = new LoopBus(1600);
  private music = new LoopBus(2600);
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private ready = false;
  private listening = false;
  private seq: ReturnType<typeof setTimeout>[] = [];

  private init() {
    if (this.ready) return;
    this.ready = true;
    // Mengen met andere apps (je eigen muziek blijft gewoon doorspelen); geluid stopt als de app naar de achtergrond gaat.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false }).catch(() => undefined);
    if (!this.listening) {
      this.listening = true;
      AppState.addEventListener('change', (st) => {
        if (st === 'active') {
          this.ambience.resume();
          this.music.resume();
        } else {
          this.ambience.pause();
          this.music.pause();
        }
      });
    }
  }

  configure(levels: SoundLevels) {
    this.init();
    this.levels = levels;
    this.ambience.setLevel(levels.on ? levels.ambience : 0);
    this.music.setLevel(levels.on ? levels.music : 0);
  }

  private player(key: string): AudioPlayer | null {
    const have = this.oneShots.get(key);
    if (have) {
      // Meest recent gebruikte achteraan houden.
      this.oneShots.delete(key);
      this.oneShots.set(key, have);
      return have;
    }
    const source = SOUND_FILES[key];
    if (source === undefined) return null;
    if (this.oneShots.size >= MAX_POOL) {
      const [oldKey, oldPlayer] = this.oneShots.entries().next().value as [string, AudioPlayer];
      this.oneShots.delete(oldKey);
      dispose(oldPlayer);
    }
    try {
      const p = createAudioPlayer(source);
      this.oneShots.set(key, p);
      return p;
    } catch {
      return null;
    }
  }

  private fire(key: string, volume: number) {
    const p = this.player(key);
    if (!p) return;
    try {
      p.volume = clamp01(volume);
      const r: any = p.seekTo(0);
      if (r && typeof r.catch === 'function') r.catch(() => undefined);
      p.play();
    } catch {
      /* geen geluid is beter dan een crash */
    }
  }

  private duckFor(ms: number) {
    this.ambience.setDuck(DUCK);
    this.music.setDuck(DUCK);
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.ambience.setDuck(1);
      this.music.setDuck(1);
      this.duckTimer = null;
    }, ms);
  }

  /** Eén effect afspelen. setting kiest de variant bij de toon van het avontuur. */
  playSfx(tag: Sfx, setting: string, soft = false) {
    if (!this.levels.on || this.levels.sfx <= 0) return;
    this.init();
    const key = SOUND_FILES[sfxFile(tag, setting)] !== undefined ? sfxFile(tag, setting) : tag;
    this.fire(key, this.levels.sfx * (soft ? SOFT : 1));
    if (!soft && tag !== 'ui_tick' && tag !== 'new_turn') this.duckFor(1400);
    if (this.levels.vibrate && !soft) {
      if (tag === 'damage_taken') Vibration.vibrate(60);
      else if (tag === 'death_sting') Vibration.vibrate([0, 90, 70, 220]);
    }
  }

  /** De effecten van een beurt na elkaar: oorzaak, dan gevolg. Een beurt zonder effect geeft een zacht omslaggeluid. */
  playTurn(sound: TurnSound | undefined, setting: string) {
    if (!this.levels.on) return;
    for (const t of this.seq) clearTimeout(t);
    this.seq = [];
    const list: Sfx[] = sound?.sfx?.length ? sound.sfx : ['new_turn'];
    const soft = !!sound?.soft || !sound?.sfx?.length;
    list.forEach((tag, i) => {
      if (i === 0) this.playSfx(tag, setting, soft);
      else this.seq.push(setTimeout(() => this.playSfx(tag, setting, soft), CAUSE_TO_EFFECT_MS * i));
    });
  }

  /** Klik op een knop in het verhaal. */
  tick() {
    this.playSfx('ui_tick', 'eigen', true);
  }

  /** Achtergrond en muziek van het verhaal dat nu open staat (null = niets). */
  setScene(ambience: Ambience | null, mood: Mood | null) {
    this.init();
    this.ambience.wanted = ambience ? ambienceFile(ambience) : null;
    this.music.wanted = mood ? moodFile(mood) : null;
    if (!this.levels.on) return;
    this.ambience.set(this.ambience.wanted);
    this.music.set(this.music.wanted);
  }

  /** Verhaalscherm verlaten: loops uitfaden. */
  leaveScene() {
    for (const t of this.seq) clearTimeout(t);
    this.seq = [];
    this.ambience.stop();
    this.music.stop();
  }
}

export const sound = new SoundManager();
