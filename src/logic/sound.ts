// Welke geluiden bij een beurt horen. Pure logica (getest); het afspelen zelf staat in src/services/sound.ts.
//
// De verteller kiest per beurt een ambience (achtergrond van de plek), een stemming (muziek) en maximaal 2 effecten voor
// wat er in het verhaal gebeurt. De app voegt zelf geluiden toe voor wat er met de held gebeurt (schade, genezing, dood,
// level, spullen, quests): die komen uit de verborgen staat, dus de speler hoort het zonder cijfers te zien.
import {
  isAmbience, isClaudeSfx, isMood,
  type Ambience, type ClaudeSfx, type Mood, type Sfx,
} from './soundTags.ts';
import type { SoundAnswer, Turn, TurnSound } from './types.ts';

export const MAX_SFX = 2;
/** Tot zoveel woorden telt een beurt als een kleine actie: dan hooguit één zacht geluid. */
export const SMALL_TURN_WORDS = 45;

export const EMPTY_SOUND_ANSWER: SoundAnswer = { ambience: '', mood: '', sfx: [] };

/** Maakt van het ruwe geluidsdeel van het antwoord iets veiligs. Onbekende tags verdwijnen; een ontbrekend deel is stil. */
export function parseSound(raw: unknown): SoundAnswer {
  if (!raw || typeof raw !== 'object') return EMPTY_SOUND_ANSWER;
  const r = raw as Record<string, unknown>;
  const sfx: ClaudeSfx[] = [];
  if (Array.isArray(r.sfx)) {
    for (const v of r.sfx) if (isClaudeSfx(v) && !sfx.includes(v) && sfx.length < MAX_SFX) sfx.push(v);
  }
  return {
    ambience: r.ambience === 'stop' ? 'stop' : isAmbience(r.ambience) ? r.ambience : '',
    mood: isMood(r.mood) ? r.mood : '',
    sfx,
  };
}

export function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Wat er deze beurt met de held gebeurde, genoeg om de geluiden van de app te kiezen. */
export type SoundFacts = {
  kind: 'start' | 'turn';
  words: number;
  damaged: boolean;
  healed: boolean;
  died: boolean;
  ended: boolean;
  levelUp: boolean;
  newTrait: boolean;
  questDone: boolean;
  itemGained: boolean;
  goldGained: boolean;
};

/**
 * Bepaalt de geluiden van één beurt.
 * Volgorde: eerst de oorzaak (effect van de verteller), dan het gevolg (schade, genezing...). Hooguit MAX_SFX effecten;
 * een effect dat de vorige beurt ook klonk wordt overgeslagen, en kleine acties krijgen hooguit één zacht geluid.
 */
export function planSound(claude: SoundAnswer, f: SoundFacts, prev?: Turn): TurnSound {
  const base = { ambience: claude.ambience, mood: claude.mood };
  const before = new Set<string>(prev?.sound?.sfx ?? []);

  if (f.kind === 'start') return { ...base, sfx: ['adventure_start'] };

  const cause: Sfx[] = claude.sfx.filter((s) => !before.has(s));
  if (f.ended) {
    if (f.died) return { ...base, sfx: [...cause.slice(0, 1), 'death_sting'] };
    return { ...base, sfx: [claude.sfx.includes('victory') ? 'victory' : 'adventure_end'] };
  }

  const consequence: Sfx | null = f.damaged ? 'damage_taken' : f.healed ? 'heal' : f.levelUp || f.newTrait ? 'power_up' : null;
  const minor: Sfx[] = [];
  if (f.questDone) minor.push('quest_done');
  if (f.itemGained) minor.push('item_pickup');
  if (f.goldGained) minor.push('coin');

  const soft = f.words <= SMALL_TURN_WORDS && !f.damaged && !f.healed;
  const sfx: Sfx[] = [...cause.slice(0, consequence ? MAX_SFX - 1 : MAX_SFX)];
  if (consequence) sfx.push(consequence);
  for (const m of minor) if (sfx.length < MAX_SFX) sfx.push(m);

  const out = soft ? sfx.slice(0, 1) : sfx;
  return { ...base, sfx: out, ...(soft ? { soft: true } : {}) };
}

/** Welke ambience er nu klinkt: de laatste beurt die er een koos (of "stop") bepaalt het. */
export function currentAmbience(turns: Turn[]): Ambience | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const a = turns[i].sound?.ambience;
    if (a === 'stop') return null;
    if (a) return a;
  }
  return null;
}

/** Welke stemming (muziek) er nu geldt. */
export function currentMood(turns: Turn[]): Mood | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const m = turns[i].sound?.mood;
    if (m) return m;
  }
  return null;
}
