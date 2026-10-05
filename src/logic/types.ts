// Alle vormen van een avontuur. Pure types, geen React.
import type { Lang } from '../i18n.ts';
import type { Ambience, ClaudeSfx, Mood, Sfx } from './soundTags.ts';

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
  /** Taal waarin dit avontuur verteld wordt. undefined = avontuur van vóór deze keuze (Nederlands). */
  lang?: Lang;
};

export type TextLength = 'kort' | 'normaal' | 'uitgebreid';
export type Arc = 'kort' | 'middel' | 'lang' | 'onbeperkt';

/**
 * Door de speler tijdens het spelen gezet ("nog 10 beurten"); overschrijft de lengte van het startscherm.
 * total = nummer van de beurt waarop het einde komt (null = onbeperkt), from = aantal beurten dat al gespeeld was.
 */
export type EndPlan = { total: number | null; from: number };

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

/** Is een personage in leven? Een dode blijft dood, tenzij het verhaal de terugkeer zelf duidelijk maakt. */
export type PersonStatus = 'levend' | 'dood' | 'vermist';

/**
 * Terugkerend personage (niet de held): vast uiterlijk voor de beelden, plus wat het verhaal niet mag vergeten.
 * Optionele velden ontbreken zolang ze niet bekend zijn (status ontbreekt = levend).
 */
export type CastMember = {
  name: string;
  look: string; // Engels, met leeftijd; leeg zolang het uiterlijk nog niet beschreven is
  status?: PersonStatus;
  home?: string; // Nederlands: waar deze persoon woont of verblijft
  role?: string; // Nederlands: wie het is, kort
  note?: string; // Nederlands: wat onthouden moet worden (hoe iemand stierf, een belofte)
  companion?: boolean; // reist nu met de held mee
};

/** Wijziging van een personage zoals de verteller die teruggeeft: lege tekst = ongewijzigd. */
export type CastUpdate = {
  name: string;
  look?: string;
  status?: '' | PersonStatus;
  home?: string;
  role?: string;
  note?: string;
  companion?: '' | 'ja' | 'nee';
};

/** Vaste plek in de wereld (een huis, winkel, schuilplaats), zodat die elke keer hetzelfde is. */
export type Place = { name: string; detail: string };

/** Wat het verhaal nooit mag vergeten naast de personen: plekken, blijvende feiten en het moment van de dag. */
export type Canon = { places: Place[]; facts: string[]; time: string };

/** Wijzigingen aan het canon-blad, zoals de verteller ze teruggeeft. */
export type CanonUpdate = { places: Place[]; facts: string[]; forgetFacts: string[]; time: string };
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

/** Het geluid van een beurt: wat de verteller koos plus wat de app zelf toevoegde (zie src/logic/sound.ts). */
export type TurnSound = {
  /** Achtergrond van de plek; '' = ongewijzigd, 'stop' = stilte. */
  ambience: Ambience | 'stop' | '';
  /** Muziekstemming; '' = ongewijzigd. */
  mood: Mood | '';
  /** Effecten, in volgorde van afspelen (oorzaak, dan gevolg). */
  sfx: Sfx[];
  /** Kleine actie: effecten zachter. */
  soft?: boolean;
};

/** Wat de verteller voor geluid teruggeeft (zie rpg/schema.json). */
export type SoundAnswer = { ambience: Ambience | 'stop' | ''; mood: Mood | ''; sfx: ClaudeSfx[] };

export type Turn = {
  id: string;
  action: string | null; // null bij de openingsscène
  narration: string;
  choices: string[];
  notes: string[]; // zichtbare wijzigingen, bv. "+ Vervloekt kaaswiel"
  at: number;
  scene?: Scene; // voor "Toon scène"
  image?: Picture;
  /** Geluid bij deze beurt. Ontbreekt bij beurten van vóór het geluid (die zijn stil). */
  sound?: TurnSound;
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
  /** Bijpersonen met een vast uiterlijk en hun status. undefined = avontuur van vóór de cast (nog nooit aangevuld). */
  cast?: CastMember[];
  /** Plekken, blijvende feiten en tijd. undefined = avontuur van vóór het canon-blad (de verteller vult het eenmalig aan). */
  canon?: Canon;
  /** Einde dat de speler tijdens het spelen koos. undefined = de lengte van het startscherm geldt. */
  endPlan?: EndPlan;
  /** De speler ging door nadat het verhaal klaar was: na hoeveel beurten, en was de held toen gevallen? */
  resumed?: { at: number; died: boolean };
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
  cast: CastUpdate[]; // nieuwe of veranderde bijpersonen deze beurt
  canon: CanonUpdate; // nieuwe of veranderde plekken, feiten en tijd deze beurt
  sound: SoundAnswer; // ambience, stemming en effecten (leeg als het verzoek geen geluid vroeg)
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
  /** Hoe hard de verteller nadacht (low, medium) en wat de beurt aan tokens kostte, voor het overzicht bij Instellingen. */
  effort?: string | null;
  usage?: Usage | null;
};

/** Verbruik van één beurt, zoals Claude Code het teruggeeft (output telt het nadenken mee). */
export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; costUsd: number | null; apiMs: number; numTurns: number };

/** Wat de app in requests/<id>.json zet. */
export type TurnRequest = {
  id: string;
  createdAt: string;
  kind: 'start' | 'turn';
  model: string;
  /** Taal waarin de verteller schrijft (de taalinstelling van de app). Ontbreekt in oude verzoeken: Nederlands. */
  lang?: Lang;
  world: World;
  hero: Hero;
  state: GameState;
  summary: string;
  cast: CastMember[];
  /** Ontbreekt bij oude avonturen: dan vraagt het verzoek de verteller het canon-blad eenmalig op te bouwen. */
  canon?: Canon;
  recent: { action: string | null; narration: string; picture?: string }[];
  /** Alleen bij oude avonturen zonder cast: eerdere beeldprompts, zodat de verteller de looks kan vastleggen. */
  earlierPictures?: string[];
  action: string | null;
  roll: number;
  /** Waar het verhaal staat: nummer van de beurt die nu geschreven wordt (0 = opening), de beurt van het einde (null = onbeperkt) en vanaf welke beurt de speler het einde koos (0 = bij de start). */
  pacing: { turn: number; total: number | null; from: number };
  /** Alleen bij de eerste beurt nadat de speler een afgesloten verhaal toch voortzette. */
  resumed?: { died: boolean };
  /** Aanwezig als de speler geluid aan heeft: de verteller kiest dan ook ambience, stemming en effecten. */
  sound?: { ambience: Ambience | null; mood: Mood | null };
};
