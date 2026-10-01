// Alle vormen van een avontuur. Pure types, geen React.

export type World = {
  setting: string; // id uit SETTINGS, bv. 'superhelden'
  settingText: string; // eigen wereld in eigen woorden
  tones: string[]; // 1 of 2 tonen
  toneText: string; // eigen toon in eigen woorden
  wishes: string; // extra wensen, bv. "geen spinnen"
};

export type Hero = {
  name: string;
  className: string;
  powers: string; // krachten en zwaktes in eigen woorden
  looks: string; // uiterlijk (later voor het portret)
};

export type Attribute = { name: string; value: number };
export type Quest = { title: string; detail: string; done: boolean };

/** Staat van het spel. Alles behalve leven, goud en level blijft voor de speler onzichtbaar. */
export type GameState = {
  hp: number;
  maxHp: number;
  gold: number;
  xp: number;
  level: number;
  location: string;
  attributes: Attribute[]; // verborgen, door Claude gemaakt bij de start
  inventory: string[];
  quests: Quest[];
};

export type Turn = {
  id: string;
  action: string | null; // null bij de openingsscène
  narration: string;
  choices: string[];
  notes: string[]; // zichtbare wijzigingen, bv. "+ Vervloekt kaaswiel"
  at: number;
};

export type Pending = {
  requestId: string;
  kind: 'start' | 'turn';
  action: string | null;
  roll: number;
  startedAt: number;
  posted: boolean; // staat het verzoek al in de rpg-data-branch?
  dispatched: boolean; // is er een losse run gestart?
};

export type TurnErrorKind = 'limiet' | 'token' | 'fout' | 'setup';
export type TurnError = { kind: TurnErrorKind; message: string; resetAt?: string | null; url?: string };

export type Adventure = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  world: World;
  hero: Hero;
  state: GameState;
  summary: string;
  turns: Turn[];
  pending: Pending | null;
  error: TurnError | null;
  ended: boolean;
};

/** Het antwoord van de verteller (zie rpg/schema.json). */
export type Answer = {
  title: string;
  narration: string;
  choices: string[];
  check: { used: boolean; attribute: string; dc: number; success: boolean };
  attributes: Attribute[];
  changes: {
    hp: number;
    gold: number;
    xp: number;
    addItems: string[];
    removeItems: string[];
    addQuests: { title: string; detail: string }[];
    completeQuests: string[];
    location: string;
  };
  summary: string;
  gameOver: boolean;
};

/** Wat de workflow terugzet in responses/<id>.json. */
export type TurnResponse = {
  id: string;
  status: 'ok' | 'limiet' | 'token' | 'fout';
  message: string;
  resetAt: string | null;
  answer: unknown;
  finishedAt: string;
  durationMs?: number;
  model?: string;
};

/** Wat de app in requests/<id>.json zet. */
export type TurnRequest = {
  id: string;
  createdAt: string;
  kind: 'start' | 'turn';
  model: string;
  world: World;
  hero: Hero;
  state: GameState;
  summary: string;
  recent: { action: string | null; narration: string }[];
  action: string | null;
  roll: number;
};
