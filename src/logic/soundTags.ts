// De geluidenlijst van de app. Moet gelijk blijven aan rpg/sounds.json (de bron voor de generator en de verteller):
// src/logic/sound.test.ts controleert dat, en dat elk geluid een bestand heeft.

/** Effecten die de verteller zelf mag kiezen (voor wat er in het verhaal gebeurt). */
export const CLAUDE_SFX = [
  'sword_swing', 'sword_hit', 'hit', 'punch', 'shield_block', 'arrow', 'gunshot', 'laser',
  'explosion', 'fireball', 'lightning', 'ice_magic', 'magic_ping', 'summon',
  'footsteps', 'door_creak', 'door_slam', 'chest_open', 'lock_click', 'glass_break',
  'water_splash', 'climb', 'fall',
  'wolf_howl', 'dragon_roar', 'monster_growl', 'horror_whisper', 'crowd_cheer', 'laugh',
  'danger_sting', 'discovery_sting', 'victory',
] as const;

/** Effecten die de app zelf kiest, uit wat er met de held gebeurt (leven, level, spullen, quests). */
export const AUTO_SFX = ['damage_taken', 'heal', 'death_sting', 'power_up', 'coin', 'item_pickup', 'quest_done'] as const;

/** Geluiden van de app zelf. */
export const APP_SFX = ['ui_tick', 'new_turn', 'adventure_start', 'adventure_end'] as const;

export const AMBIENCES = [
  'forest_night', 'forest_day', 'cave', 'dungeon', 'city_rain', 'city_day', 'market', 'tavern',
  'sea_waves', 'desert_wind', 'snow_wind', 'mountains', 'battlefield', 'horror_house', 'spaceship_hum',
] as const;

export const MOODS = ['calm', 'tense', 'action', 'sad', 'triumph'] as const;

export type ClaudeSfx = (typeof CLAUDE_SFX)[number];
export type AutoSfx = (typeof AUTO_SFX)[number];
export type AppSfx = (typeof APP_SFX)[number];
export type Sfx = ClaudeSfx | AutoSfx | AppSfx;
export type Ambience = (typeof AMBIENCES)[number];
export type Mood = (typeof MOODS)[number];

/** Per setting de effecten die een eigen variant hebben (bestand `tag__setting`). Andere settings gebruiken het standaardgeluid. */
export const VARIANTS: Record<string, readonly string[]> = {
  superhelden: ['punch', 'fireball', 'explosion', 'magic_ping', 'lightning'],
  scifi: ['sword_swing', 'sword_hit', 'gunshot', 'magic_ping', 'door_creak', 'door_slam', 'footsteps', 'explosion'],
  horror: ['footsteps', 'door_creak', 'danger_sting', 'monster_growl'],
  apocalyps: ['gunshot', 'explosion', 'footsteps'],
  noir: ['gunshot', 'footsteps', 'door_slam'],
  modern: ['gunshot', 'footsteps', 'door_slam'],
};

const CLAUDE_SET = new Set<string>(CLAUDE_SFX);
const AMBIENCE_SET = new Set<string>(AMBIENCES);
const MOOD_SET = new Set<string>(MOODS);

export const isClaudeSfx = (v: unknown): v is ClaudeSfx => typeof v === 'string' && CLAUDE_SET.has(v);
export const isAmbience = (v: unknown): v is Ambience => typeof v === 'string' && AMBIENCE_SET.has(v);
export const isMood = (v: unknown): v is Mood => typeof v === 'string' && MOOD_SET.has(v);

/** Bestandsnaam (sleutel in SOUND_FILES) van een effect voor deze setting: de variant als die er is, anders het standaardgeluid. */
export function sfxFile(tag: string, setting: string): string {
  return VARIANTS[setting]?.includes(tag) ? `${tag}__${setting}` : tag;
}

export const ambienceFile = (a: Ambience): string => `amb_${a}`;
export const moodFile = (m: Mood): string => `music_${m}`;
