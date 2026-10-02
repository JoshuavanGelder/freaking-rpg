// De spelregels van de app: avontuur maken, verzoek opbouwen en het antwoord van de verteller
// veilig toepassen. De app is baas over de staat; Claude stelt alleen wijzigingen voor.
import type { Adventure, Answer, Attribute, CastMember, GameState, Hero, Pending, Picture, PictureKind, Turn, TurnRequest, World } from './types.ts';

export type Setting = { id: string; label: string; hint: string; classes: string[] };

export const SETTINGS: Setting[] = [
  { id: 'fantasy', label: 'Fantasy', hint: 'Draken, magie en herbergen', classes: ['Krijger', 'Sluipdief', 'Magiër', 'Bard'] },
  { id: 'superhelden', label: 'Superhelden', hint: 'Krachten, schurken, geheime identiteit', classes: ['Speedster', 'Vliegende krachtpatser', 'Ringdrager', 'Gadget-genie'] },
  { id: 'scifi', label: 'Sci-fi', hint: 'Ruimteschepen, AI en kolonies', classes: ['Piloot', 'Hacker', 'Huurling', 'Xenobioloog'] },
  { id: 'horror', label: 'Horror', hint: 'Er klopt iets niet', classes: ['Journalist', 'Priester', 'Student', 'Nachtwaker'] },
  { id: 'apocalyps', label: 'Post-apocalyps', hint: 'Puin, schaarste, mutanten', classes: ['Aaseter', 'Monteur', 'Medicus', 'Koerier'] },
  { id: 'noir', label: 'Noir-detective', hint: 'Regen, rook en leugens', classes: ['Privédetective', 'Rechercheur', 'Journalist', 'Oplichter'] },
  { id: 'modern', label: 'Modern', hint: 'De gewone wereld, maar raar', classes: ['Bezorger', 'Student', 'Influencer', 'Conciërge'] },
  { id: 'eigen', label: 'Eigen wereld', hint: 'Beschrijf het zelf', classes: ['Avonturier', 'Held', 'Schurk', 'Gewone burger'] },
];

export const TONES = ['Humoristisch', 'Episch', 'Rauw', 'Duister', 'Absurd', 'Gezellig', 'Eigen toon'];
export const OWN_TONE = 'Eigen toon';

export const START_HP = 20;
export const START_GOLD = 10;
export const XP_PER_LEVEL = 100;
const MAX_INVENTORY = 30;
const MAX_QUESTS = 30;
const RECENT_TURNS = 6;
const MAX_CAST = 24;
const EARLIER_PICTURES = 12;

export function settingOf(id: string): Setting {
  return SETTINGS.find((s) => s.id === id) ?? SETTINGS[SETTINGS.length - 1];
}

/** Kort label voor lijsten: "Superhelden · Humoristisch + Rauw". */
export function worldLabel(w: World): string {
  const s = w.setting === 'eigen' ? (w.settingText.trim() ? 'Eigen wereld' : settingOf(w.setting).label) : settingOf(w.setting).label;
  const tones = w.tones.filter(Boolean).join(' + ');
  return tones ? `${s} · ${tones}` : s;
}

/** Toon kiezen: aan/uit, maximaal 2 (de oudste valt af). */
export function toggleTone(current: string[], tone: string): string[] {
  if (current.includes(tone)) return current.filter((t) => t !== tone);
  return [...current, tone].slice(-2);
}

/** Wat ontbreekt er nog om te kunnen beginnen? null = alles goed. */
export function worldProblem(w: World): string | null {
  if (!w.setting) return 'Kies een setting.';
  if (w.setting === 'eigen' && !w.settingText.trim()) return 'Beschrijf je eigen wereld.';
  if (!w.tones.length) return 'Kies minstens één toon.';
  if (w.tones.includes(OWN_TONE) && !w.toneText.trim()) return 'Beschrijf je eigen toon.';
  return null;
}

export function heroProblem(h: Hero): string | null {
  if (!h.name.trim()) return 'Geef je held een naam.';
  if (!h.className.trim()) return 'Kies of typ een klasse.';
  return null;
}

export function newId(now = Date.now(), rand: () => number = Math.random): string {
  return `${now.toString(36)}-${Math.floor(rand() * 36 ** 5).toString(36).padStart(5, '0')}`;
}

export function rollD20(rand: () => number = Math.random): number {
  return Math.min(20, Math.max(1, Math.floor(rand() * 20) + 1));
}

export function initialState(): GameState {
  return { hp: START_HP, maxHp: START_HP, gold: START_GOLD, xp: 0, level: 1, location: '', attributes: [], inventory: [], quests: [] };
}

export function newAdventure(world: World, hero: Hero, now = Date.now(), id = newId(now)): Adventure {
  return {
    id,
    title: hero.name.trim() || 'Nieuw avontuur',
    createdAt: now,
    updatedAt: now,
    world: {
      setting: world.setting,
      settingText: world.setting === 'eigen' ? world.settingText.trim() : '',
      tones: [...world.tones],
      toneText: world.tones.includes(OWN_TONE) ? world.toneText.trim() : '',
      wishes: world.wishes.trim(),
    },
    hero: { name: hero.name.trim(), className: hero.className.trim(), powers: hero.powers.trim(), looks: hero.looks.trim() },
    state: initialState(),
    summary: '',
    turns: [],
    pending: null,
    error: null,
    ended: false,
  };
}

/** Een nieuwe beurt klaarzetten (nog niet verstuurd). */
export function makePending(kind: 'start' | 'turn', action: string | null, now = Date.now(), rand: () => number = Math.random): Pending {
  return { requestId: newId(now, rand), kind, action, roll: rollD20(rand), startedAt: now, posted: false, dispatched: false };
}

/** Het verzoek voor de workflow: alles wat de verteller nodig heeft, want die onthoudt zelf niets. */
export function buildRequest(adv: Adventure, pending: Pending, model: string): TurnRequest {
  const w = adv.world;
  const world = {
    ...w,
    setting: settingOf(w.setting).label,
    tones: w.tones.filter((t) => t !== OWN_TONE),
  };
  return {
    id: pending.requestId,
    createdAt: new Date(pending.startedAt).toISOString(),
    kind: pending.kind,
    model,
    world,
    // Oude looks met een kostuum (van vóór de nieuwe regels) eerst opschonen, anders herhaalt de verteller ze.
    hero: adv.hero.heroLook ? { ...adv.hero, heroLook: defuse(adv.hero.heroLook) } : adv.hero,
    state: adv.state,
    summary: adv.summary,
    cast: (adv.cast ?? []).map((c) => ({ name: c.name, look: defuse(c.look) })),
    recent: adv.turns.slice(-RECENT_TURNS).map((t) => {
      const picture = drawnPrompt(t);
      return picture ? { action: t.action, narration: t.narration, picture } : { action: t.action, narration: t.narration };
    }),
    ...(adv.cast === undefined && pending.kind === 'turn' ? { earlierPictures: earlierPictures(adv) } : {}),
    action: pending.action,
    roll: pending.roll,
  };
}

/** De prompt van het beeld dat bij een beurt echt gemaakt is (of wordt). */
function drawnPrompt(t: Turn): string {
  return t.image && t.image.status !== 'failed' ? t.image.prompt : '';
}

/** Beeldprompts van vóór de laatste beurten (oudste eerst), voor oude avonturen zonder cast. */
function earlierPictures(adv: Adventure): string[] {
  const older = adv.turns.slice(0, Math.max(0, adv.turns.length - RECENT_TURNS));
  return older.map(drawnPrompt).filter(Boolean).slice(-EARLIER_PICTURES);
}

/** Voegt nieuwe of veranderde bijpersonen samen met de bestaande cast (zelfde naam = bijwerken). */
export function mergeCast(cast: CastMember[], updates: CastMember[], heroName = ''): CastMember[] {
  const list = cast.map((c) => ({ ...c }));
  for (const u of updates) {
    if (heroName && same(u.name, heroName)) continue;
    const i = list.findIndex((c) => same(c.name, u.name));
    if (i >= 0) list[i] = { name: list[i].name, look: u.look };
    else list.push(u);
  }
  return list.slice(-MAX_CAST);
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const int = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(hi, Math.max(lo, n));
};
const strList = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : [];

/** Maakt van het ruwe antwoord een veilig Answer, of null als er geen verhaal in staat. */
export function parseAnswer(raw: unknown): Answer | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, any>;
  const narration = typeof a.narration === 'string' ? a.narration.replace(/\r/g, '').trim().slice(0, 4000) : '';
  if (!narration) return null;
  const ch = a.changes && typeof a.changes === 'object' ? a.changes : {};
  const check = a.check && typeof a.check === 'object' ? a.check : {};
  const img = a.image && typeof a.image === 'object' ? a.image : {};
  return {
    title: str(a.title, 60),
    narration,
    choices: strList(a.choices, 3, 80),
    check: { used: !!check.used, attribute: str(check.attribute, 40), dc: int(check.dc, 0, 30), success: check.success !== false },
    attributes: Array.isArray(a.attributes)
      ? a.attributes
          .map((x: any): Attribute => ({ name: str(x?.name, 30), value: int(x?.value, 0, 5) }))
          .filter((x: Attribute) => x.name)
          .slice(0, 6)
      : [],
    changes: {
      hp: int(ch.hp, -10, 10),
      gold: int(ch.gold, -9999, 9999),
      xp: int(ch.xp, 0, 30),
      addItems: strList(ch.addItems, 6, 40),
      removeItems: strList(ch.removeItems, 6, 40),
      addQuests: Array.isArray(ch.addQuests)
        ? ch.addQuests.map((q: any) => ({ title: str(q?.title, 60), detail: str(q?.detail, 120) })).filter((q: { title: string }) => q.title).slice(0, 3)
        : [],
      completeQuests: strList(ch.completeQuests, 5, 60),
      location: str(ch.location, 60),
    },
    summary: typeof a.summary === 'string' ? a.summary.trim().slice(0, 1500) : '',
    gameOver: !!a.gameOver,
    image: {
      show: !!img.show,
      kind: img.kind === 'action' || img.kind === 'character' ? img.kind : 'scene',
      prompt: str(img.prompt, 800),
      fallback: str(img.fallback, 400),
    },
    heroLook: str(a.heroLook, 400),
    portrait: str(a.portrait, 600),
    cast: Array.isArray(a.cast)
      ? a.cast
          .map((x: any): CastMember => ({ name: str(x?.name, 40), look: str(x?.look, 300) }))
          .filter((x: CastMember) => x.name && x.look)
          .slice(0, 8)
      : [],
  };
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Past het antwoord toe op het avontuur. De app bewaakt de grenzen. images = mogen er beelden gemaakt worden? */
export function applyAnswer(adv: Adventure, pending: Pending, answer: Answer, now = Date.now(), images = false): Adventure {
  const s = adv.state;
  const c = answer.changes;
  const notes: string[] = [];

  // Leven, goud, ervaring en level.
  const xp = s.xp + c.xp;
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const levelsUp = Math.max(0, level - s.level);
  const maxHp = s.maxHp + levelsUp * 2;
  let hp = Math.min(maxHp, Math.max(0, s.hp + c.hp + levelsUp * 2));
  if (levelsUp) notes.push(`Level ${level}`);
  const gold = Math.max(0, s.gold + c.gold);

  // Spullen.
  let inventory = [...s.inventory];
  for (const item of c.removeItems) {
    const i = inventory.findIndex((x) => same(x, item));
    if (i >= 0) {
      notes.push(`− ${inventory[i]}`);
      inventory.splice(i, 1);
    }
  }
  for (const item of c.addItems) {
    if (inventory.length >= MAX_INVENTORY) break;
    inventory.push(item);
    notes.push(`+ ${item}`);
  }

  // Quests.
  let quests = s.quests.map((q) => ({ ...q }));
  for (const title of c.completeQuests) {
    const q = quests.find((x) => !x.done && same(x.title, title));
    if (q) {
      q.done = true;
      notes.push(`Quest voltooid: ${q.title}`);
    }
  }
  for (const q of c.addQuests) {
    if (quests.some((x) => same(x.title, q.title))) continue;
    quests.push({ title: q.title, detail: q.detail, done: false });
    notes.push(`Nieuwe quest: ${q.title}`);
  }
  if (quests.length > MAX_QUESTS) {
    // Oude afgeronde quests eerst laten vallen.
    const open = quests.filter((q) => !q.done);
    const done = quests.filter((q) => q.done);
    quests = [...done.slice(Math.max(0, done.length - (MAX_QUESTS - open.length))), ...open];
  }

  const location = c.location || s.location;
  if (c.location && !same(c.location, s.location)) notes.push(`Locatie: ${c.location}`);

  // Verborgen eigenschappen: alleen bij de start (of als ze nog ontbreken).
  const attributes = s.attributes.length ? s.attributes : answer.attributes;

  const ended = answer.gameOver || hp <= 0;
  if (ended) hp = Math.max(0, hp);

  const im = answer.image;
  const scene = im.prompt ? { kind: im.kind as PictureKind, prompt: im.prompt, fallback: im.fallback } : undefined;
  const turn: Turn = {
    id: pending.requestId,
    action: pending.action,
    narration: answer.narration,
    choices: ended ? [] : answer.choices,
    notes,
    at: now,
    ...(scene ? { scene } : {}),
    ...(scene && images && (im.show || pending.kind === 'start') ? { image: newPicture(`${pending.requestId}-beeld`, scene, now) } : {}),
  };

  const hero: Hero = answer.heroLook ? { ...adv.hero, heroLook: answer.heroLook } : adv.hero;
  const portraitPrompt = pending.kind === 'start' && answer.portrait ? answer.portrait : '';
  const portrait =
    portraitPrompt && images
      ? newPicture(`${adv.id}-portret`, { kind: 'portrait', prompt: portraitPrompt, fallback: `head and shoulders portrait of ${hero.heroLook || 'a person in a casual jacket'}, calm expression, plain softly lit background` }, now)
      : adv.portrait;

  const state: GameState = { hp, maxHp, gold, xp, level, location, attributes, inventory, quests };
  return {
    ...adv,
    hero,
    ...(portrait ? { portrait } : {}),
    title: pending.kind === 'start' && answer.title ? answer.title : adv.title,
    state,
    summary: answer.summary || adv.summary,
    turns: [...adv.turns, turn],
    cast: mergeCast(adv.cast ?? [], answer.cast, hero.name),
    pending: null,
    error: null,
    ended,
    updatedAt: now,
  };
}

/** Zichtbare tekst van de laatste beurt in de lijst ("Beurt 12"). */
export function turnCount(adv: Adventure): number {
  return adv.turns.filter((t) => t.action !== null).length;
}

/** "zojuist", "5 min geleden", "gisteren", "3 dagen geleden". */
export function ago(ts: number, now = Date.now()): string {
  const min = Math.round((now - ts) / 60000);
  if (min < 2) return 'zojuist';
  if (min < 60) return `${min} min geleden`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.round(h / 24);
  if (d === 1) return 'gisteren';
  if (d < 14) return `${d} dagen geleden`;
  return `${Math.round(d / 7)} weken geleden`;
}

/** Splitst de verteltekst in alinea's. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

// ---------- beelden ----------

/** Beelden zijn vierkant en maximaal 512x512, gemaakt met het goedkoopste model. */
export const IMAGE_SIZE = 512;
export const DEFAULT_IMAGE_LIMIT = 150;

const STYLES: Record<string, string> = {
  fantasy: 'painterly fantasy illustration, rich warm colors, cinematic lighting',
  superhelden: 'dynamic comic book art, bold ink lines, vivid colors, cinematic lighting',
  scifi: 'cinematic sci-fi concept art, moody lighting, detailed',
  horror: 'dark atmospheric horror illustration, muted colors, eerie lighting',
  apocalyps: 'gritty post-apocalyptic concept art, dusty light, muted colors',
  noir: 'film noir illustration, high contrast, rain, neon reflections',
  modern: 'semi-realistic digital illustration, natural light',
  eigen: 'painterly digital illustration, cinematic lighting',
};

/** Prompt + vaste stijl per setting, zodat alle beelden van een avontuur bij elkaar passen. */
/**
 * Haalt superheldenwoorden uit een beeldprompt. Het filter van Cloudflare weigert alles wat op een
 * superheld lijkt (kostuum, embleem, cape, masker, "speedster"); een held in een gewone jas komt wel door.
 * Getest: "young man in a red suit with lightning emblem" → geweigerd, "young man in a red jacket" → goed.
 */
export function defuse(prompt: string): string {
  return prompt
    .replace(/\b(?:with|and|bearing|featuring)\s+(?:a|an|the)?\s*(?:[\w-]+\s+){0,3}(?:emblems?|insignias?|logos?|symbols?|crests?)(?:\s+on\s+(?:his|her|their|the)\s+\w+)?/gi, '')
    .replace(/\b(?:[\w-]+\s+){0,2}(?:emblems?|insignias?|logos?|symbols?)\b/gi, '')
    .replace(/\b(?:full-body\s+|skin-?tight\s+|form-fitting\s+)?(?:speed(?:ster)?\s+|super-?hero\s+)?(?:suits?|costumes?|spandex|bodysuits?|uniforms?)\b/gi, 'jacket')
    .replace(/\b(?:super-?\s?heroe?s?|speedsters?|vigilantes?|super-?villains?)\b/gi, 'person')
    .replace(/\b(?:capes?|cloaks?)\b/gi, 'scarf')
    .replace(/\b(?:masked|caped|costumed|hooded crime-fighting)\s+/gi, '')
    .replace(/\b(?:masks?|cowls?|domino masks?)\b/gi, 'sunglasses')
    .replace(/\b(?:a|an)\s+person\b/gi, 'a young person')
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const PLACE_WORLD: Record<string, string> = {
  fantasy: 'a medieval fantasy world',
  superhelden: 'a modern big city',
  scifi: 'a futuristic sci-fi world',
  horror: 'an eerie, quiet town',
  apocalyps: 'a ruined post-apocalyptic land',
  noir: 'a rainy 1940s city',
  modern: 'a modern town',
  eigen: 'a storybook world',
};

/** Laatste vangnet: een sfeerbeeld van de plek, zonder personen. Komt vrijwel altijd door het filter. */
export function placePrompt(setting: string, location: string): string {
  const where = location.trim() ? `${location.trim()}, ` : '';
  return `Atmospheric wide establishing shot of ${where}in ${PLACE_WORLD[setting] ?? PLACE_WORLD.eigen}, empty, no people, soft light`;
}

/**
 * Volgorde van pogingen als het filter weigert: de prompt zelf, dan maximaal 3 andere:
 * de opgeschoonde prompt, de opgeschoonde reserve (alleen de plek), en een sfeerbeeld van de plek.
 */
export function promptAttempts(pic: { kind?: string; prompt: string; fallback: string }, setting = 'eigen', location = ''): string[] {
  const list = [pic.prompt, defuse(pic.prompt), defuse(pic.fallback)];
  if (pic.kind !== 'portrait') list.push(placePrompt(setting, location));
  const clean = list.map((x) => x.trim()).filter(Boolean);
  return clean.filter((x, i) => clean.indexOf(x) === i);
}

export function styledPrompt(setting: string, prompt: string): string {
  const style = STYLES[setting] ?? STYLES.eigen;
  return `${prompt.trim().replace(/[.\s]+$/, '')}. ${style}, no text, no lettering, no watermark`;
}

export function newPicture(id: string, scene: { kind: PictureKind; prompt: string; fallback: string }, now = Date.now()): Picture {
  return { id, kind: scene.kind, prompt: scene.prompt, fallback: scene.fallback || scene.prompt, status: 'pending', at: now };
}

/** Alle beelden van een avontuur, oudste eerst (portret voorop). */
export function picturesOf(adv: Adventure): Picture[] {
  const list: Picture[] = [];
  if (adv.portrait) list.push(adv.portrait);
  for (const t of adv.turns) if (t.image) list.push(t.image);
  return list;
}

export function findPicture(adv: Adventure, id: string): Picture | null {
  return picturesOf(adv).find((p) => p.id === id) ?? null;
}

/** Werkt één beeld bij (portret of beeld van een beurt). */
export function updatePicture(adv: Adventure, id: string, patch: Partial<Picture>): Adventure {
  if (adv.portrait?.id === id) return { ...adv, portrait: { ...adv.portrait, ...patch } };
  return { ...adv, turns: adv.turns.map((t) => (t.image?.id === id ? { ...t, image: { ...t.image, ...patch } } : t)) };
}

/** "Toon scène": vraagt een beeld van een beurt die er nog geen had (of opnieuw na een fout). */
export function requestPicture(adv: Adventure, turnId: string, now = Date.now()): Adventure {
  return {
    ...adv,
    turns: adv.turns.map((t) => {
      if (t.id !== turnId || !t.scene) return t;
      if (t.image && t.image.status !== 'failed') return t;
      return { ...t, image: newPicture(`${t.id}-beeld`, t.scene, now) };
    }),
  };
}

/** Portret opnieuw proberen (of alsnog maken). */
export function requestPortrait(adv: Adventure, now = Date.now()): Adventure {
  if (!adv.portrait || adv.portrait.status !== 'failed') return adv;
  return { ...adv, portrait: { ...adv.portrait, status: 'pending', error: undefined, at: now } };
}

/** Dag van het gratis Cloudflare-tegoed (dat begint om 00:00 UTC opnieuw). */
export function quotaDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type ImageCounter = { day: string; count: number; exhausted: boolean };

export function imagesUsed(c: ImageCounter | null | undefined, now = Date.now()): ImageCounter {
  const day = quotaDay(now);
  return c && c.day === day ? c : { day, count: 0, exhausted: false };
}

export function canMakeImage(c: ImageCounter | null | undefined, limit: number, now = Date.now()): boolean {
  const u = imagesUsed(c, now);
  return !u.exhausted && u.count < limit;
}
