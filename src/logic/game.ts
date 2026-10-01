// De spelregels van de app: avontuur maken, verzoek opbouwen en het antwoord van de verteller
// veilig toepassen. De app is baas over de staat; Claude stelt alleen wijzigingen voor.
import type { Adventure, Answer, Attribute, GameState, Hero, Pending, Turn, TurnRequest, World } from './types.ts';

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
    hero: adv.hero,
    state: adv.state,
    summary: adv.summary,
    recent: adv.turns.slice(-RECENT_TURNS).map((t) => ({ action: t.action, narration: t.narration })),
    action: pending.action,
    roll: pending.roll,
  };
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
  };
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Past het antwoord toe op het avontuur. De app bewaakt de grenzen. */
export function applyAnswer(adv: Adventure, pending: Pending, answer: Answer, now = Date.now()): Adventure {
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

  const turn: Turn = {
    id: pending.requestId,
    action: pending.action,
    narration: answer.narration,
    choices: ended ? [] : answer.choices,
    notes,
    at: now,
  };

  const state: GameState = { hp, maxHp, gold, xp, level, location, attributes, inventory, quests };
  return {
    ...adv,
    title: pending.kind === 'start' && answer.title ? answer.title : adv.title,
    state,
    summary: answer.summary || adv.summary,
    turns: [...adv.turns, turn],
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
