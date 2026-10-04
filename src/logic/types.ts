// Alle vormen van een avontuur. Pure types, geen React.

export type World = {
  setting: string; // id uit SETTINGS, bv. 'superhelden'
  settingText: string; // eigen wereld in eigen woorden
  tones: string[]; // 1 of 2 tonen
  toneText: string; // eigen toon in eigen woorden
  wishes: string; // extra wensen, bv. "geen spinnen"
  /** Lengte van de verteltekst per beurt. undefined = avontuur van vóór deze keuze (normaal). */
  textLength?: TextLength;
  /** Hoe lang het avontuur duurt voor het een einde krijgt. undefined = avontuur van vóór deze keuze (onbeperkt). */
  arc?: Arc;
};

export type TextLength = 'kort' | 'normaal' | 'uitgebreid';
export type Arc = 'kort' | 'middel' | 'lang' | 'onbeperkt';

export type Hero = {
  name: string;
  className: string;
  powers: string; // krachten en zwaktes in eigen woorden
  looks: string; // uiterlijk in eigen woorden
  heroLook?: string; // Engelse beschrijving voor beelden, door de verteller gemaakt bij de start
};

export type PictureKind = 'portrait' | 'scene' | 'action' | 'character';

/** Een beeld (max. 512x512) van een moment of van de held. Het bestand staat op de telefoon. */
export type Picture = {
  id: string;
  kind: PictureKind;
  prompt: string; // Engels, zonder stijl (die voegt de app toe)
  fallback: string; // rustige versie voor als het filter de prompt weigert
  status: 'pending' | 'ok' | 'failed';
  uri?: string;
  error?: string;
  at: number;
};

/** Wat de verteller over het beeld van een moment zei (ook als er nog geen beeld is). */
export type Scene = { kind: PictureKind; prompt: string; fallback: string };

export type Attribute = { name: string; value: number };

/** Vast uiterlijk van een terugkerend personage (niet de held), zodat beelden en verhaal kloppen. */
export type CastMember = { name: string; look: string }; // look: Engels, met leeftijd
export type Quest = { title: string; detail: string; done: boolean };

/** Kracht of zwakte die de held in het verhaal kreeg (zichtbaar, zonder cijfers). */
export type Trait = { name: string; kind: 'kracht' | 'zwakte'; detail: string };

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
  /** In het verhaal gekregen krachten en zwaktes. undefined = avontuur van vóór deze lijst. */
  traits?: Trait[];
  /** Natuurlijk zelfherstel van deze held (alleen als het bij het verhaal past). undefined = geen. */
  regen?: Regen;
};

/** Hoeveel een held vanzelf herstelt op een beurt zonder schade. */
export type Regen = 'traag' | 'snel';

/** Grootte van een heling: een deel van het maximale leven, door de app uitgerekend. */
export type Heal = '' | 'klein' | 'groot' | 'volledig';

export type Turn = {
  id: string;
  action: string | null; // null bij de openingsscène
  narration: string;
  choices: string[];
  notes: string[]; // zichtbare wijzigingen, bv. "+ Vervloekt kaaswiel"
  at: number;
  scene?: Scene; // voor "Toon scène"
  image?: Picture;
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
  portrait?: Picture;
  /** Bijpersonen met een vast uiterlijk. undefined = avontuur van vóór de cast (nog nooit aangevuld). */
  cast?: CastMember[];
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
    heal: Heal; // heling als maat (klein/groot/volledig); de app rekent het getal uit
    regen: '' | 'geen' | Regen; // '' = ongewijzigd
    gold: number;
    xp: number;
    addItems: string[];
    removeItems: string[];
    addQuests: { title: string; detail: string }[];
    completeQuests: string[];
    location: string;
    addTraits: Trait[];
    removeTraits: string[];
  };
  summary: string;
  gameOver: boolean;
  image: { show: boolean; kind: 'scene' | 'action' | 'character'; prompt: string; fallback: string };
  heroLook: string;
  portrait: string;
  cast: CastMember[]; // nieuwe of veranderde bijpersonen deze beurt
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
  cast: CastMember[];
  recent: { action: string | null; narration: string; picture?: string }[];
  /** Alleen bij oude avonturen zonder cast: eerdere beeldprompts, zodat de verteller de looks kan vastleggen. */
  earlierPictures?: string[];
  action: string | null;
  roll: number;
  /** Waar het verhaal staat: nummer van de beurt die nu geschreven wordt (0 = opening) en de gekozen lengte (null = onbeperkt). */
  pacing: { turn: number; total: number | null };
};
