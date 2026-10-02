import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnswer,
  canMakeImage,
  defuse,
  promptAttempts,
  imagesUsed,
  picturesOf,
  requestPicture,
  styledPrompt,
  updatePicture,
  buildRequest,
  heroProblem,
  makePending,
  newAdventure,
  paragraphs,
  parseAnswer,
  rollD20,
  toggleTone,
  worldLabel,
  worldProblem,
} from './game.ts';
import type { World } from './types.ts';

const world: World = { setting: 'superhelden', settingText: '', tones: ['Humoristisch', 'Rauw'], toneText: '', wishes: ' geen spinnen ' };
const hero = { name: 'Bliksem Bas', className: 'Speedster', powers: 'supersnel, maar altijd honger', looks: '' };

const raw = (over: Record<string, any> = {}) => ({
  title: 'De Gestolen Taart',
  narration: 'Je rent.\n\nDe wind fluit.',
  choices: ['Rennen', 'Praten', 'Eten'],
  check: { used: true, attribute: 'Snelheid', dc: 12, success: true },
  attributes: [
    { name: 'Snelheid', value: 5 },
    { name: 'Uithoudingsvermogen', value: 9 },
  ],
  changes: { hp: 0, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '' },
  summary: 'Bas begon.',
  gameOver: false,
  image: { show: true, kind: 'scene', prompt: 'A rooftop at night.', fallback: 'A quiet rooftop.' },
  heroLook: 'lanky teen in a red hoodie',
  portrait: 'Portrait of a lanky teen in a red hoodie',
  ...over,
});

test('toon kiezen: maximaal 2, oudste valt af', () => {
  assert.deepEqual(toggleTone([], 'Episch'), ['Episch']);
  assert.deepEqual(toggleTone(['Episch', 'Rauw'], 'Duister'), ['Rauw', 'Duister']);
  assert.deepEqual(toggleTone(['Episch', 'Rauw'], 'Episch'), ['Rauw']);
});

test('wereld en held controleren', () => {
  assert.equal(worldProblem(world), null);
  assert.match(worldProblem({ ...world, tones: [] }) ?? '', /toon/);
  assert.match(worldProblem({ ...world, setting: 'eigen' }) ?? '', /eigen wereld/);
  assert.match(worldProblem({ ...world, tones: ['Eigen toon'] }) ?? '', /eigen toon/);
  assert.equal(heroProblem(hero), null);
  assert.match(heroProblem({ ...hero, name: ' ' }) ?? '', /naam/);
  assert.equal(worldLabel(world), 'Superhelden · Humoristisch + Rauw');
});

test('dobbelsteen blijft tussen 1 en 20', () => {
  assert.equal(rollD20(() => 0), 1);
  assert.equal(rollD20(() => 0.9999), 20);
});

test('verzoek bevat alles wat de verteller nodig heeft', () => {
  const adv = newAdventure(world, hero, 1000, 'adv-1');
  assert.equal(adv.world.wishes, 'geen spinnen');
  const p = makePending('start', null, 2000, () => 0.5);
  const req = buildRequest(adv, p, 'sonnet');
  assert.equal(req.kind, 'start');
  assert.equal(req.world.setting, 'Superhelden');
  assert.deepEqual(req.world.tones, ['Humoristisch', 'Rauw']);
  assert.equal(req.roll, 11);
  assert.equal(req.recent.length, 0);
});

test('eigen toon gaat als tekst mee, niet als label', () => {
  const adv = newAdventure({ ...world, tones: ['Episch', 'Eigen toon'], toneText: 'als een natuurdocumentaire' }, hero, 1, 'adv-2');
  const req = buildRequest(adv, makePending('start', null, 2), 'haiku');
  assert.deepEqual(req.world.tones, ['Episch']);
  assert.equal(req.world.toneText, 'als een natuurdocumentaire');
});

test('antwoord wordt veilig gemaakt', () => {
  const a = parseAnswer(raw({ changes: { hp: -50, gold: 3, xp: 99, addItems: ['  Taart  ', ''], removeItems: [], addQuests: [{ title: 'Vind de dief', detail: 'snel' }], completeQuests: [], location: 'Stadhuis' } }));
  assert.ok(a);
  assert.equal(a.changes.hp, -10);
  assert.equal(a.changes.xp, 30);
  assert.deepEqual(a.changes.addItems, ['Taart']);
  assert.equal(a.attributes[1].value, 5);
  assert.equal(parseAnswer({ narration: '  ' }), null);
  assert.equal(parseAnswer(null), null);
});

test('startbeurt: titel, verborgen eigenschappen en eerste scène', () => {
  const adv = newAdventure(world, hero, 1, 'adv-3');
  const p = makePending('start', null, 2);
  const next = applyAnswer(adv, p, parseAnswer(raw())!, 3);
  assert.equal(next.title, 'De Gestolen Taart');
  assert.equal(next.state.attributes.length, 2);
  assert.equal(next.turns.length, 1);
  assert.equal(next.turns[0].action, null);
  assert.equal(next.pending, null);
});

test('beurt: leven, spullen, quests en locatie', () => {
  let adv = newAdventure(world, hero, 1, 'adv-4');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw({ changes: { hp: 0, gold: 0, xp: 0, addItems: ['Energiereep'], removeItems: [], addQuests: [{ title: 'Vind de dief', detail: 'Hij stal de taart' }], completeQuests: [], location: 'Markt' } }))!, 3);
  const p = makePending('turn', 'Ik eet de reep', 4);
  const next = applyAnswer(
    adv,
    p,
    parseAnswer(raw({ title: 'Andere titel', attributes: [{ name: 'Nieuw', value: 1 }], changes: { hp: -4, gold: -50, xp: 20, addItems: [], removeItems: ['energiereep', 'Bestaat niet'], addQuests: [{ title: 'vind de dief', detail: 'dubbel' }], completeQuests: ['VIND DE DIEF'], location: 'Stadhuis' } }))!,
    5,
  );
  assert.equal(next.title, 'De Gestolen Taart');
  assert.equal(next.state.hp, 16);
  assert.equal(next.state.gold, 0);
  assert.deepEqual(next.state.inventory, []);
  assert.equal(next.state.quests.length, 1);
  assert.equal(next.state.quests[0].done, true);
  assert.equal(next.state.location, 'Stadhuis');
  assert.equal(next.state.attributes[0].name, 'Snelheid');
  assert.deepEqual(next.turns[1].notes, ['− Energiereep', 'Quest voltooid: Vind de dief', 'Locatie: Stadhuis']);
});

test('level omhoog geeft meer maximaal leven', () => {
  let adv = newAdventure(world, hero, 1, 'adv-5');
  adv = { ...adv, state: { ...adv.state, xp: 90, hp: 10 } };
  const next = applyAnswer(adv, makePending('turn', 'x', 2), parseAnswer(raw({ changes: { hp: 0, gold: 0, xp: 15, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '' } }))!, 3);
  assert.equal(next.state.level, 2);
  assert.equal(next.state.maxHp, 22);
  assert.equal(next.state.hp, 12);
  assert.ok(next.turns[0].notes.includes('Level 2'));
});

test('op 0 leven is het verhaal klaar', () => {
  let adv = newAdventure(world, hero, 1, 'adv-6');
  adv = { ...adv, state: { ...adv.state, hp: 3 } };
  const next = applyAnswer(adv, makePending('turn', 'Ik spring', 2), parseAnswer(raw({ changes: { hp: -8, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '' } }))!, 3);
  assert.equal(next.state.hp, 0);
  assert.equal(next.ended, true);
  assert.deepEqual(next.turns[0].choices, []);
});

test('alinea\'s', () => {
  assert.deepEqual(paragraphs('Een\nregel.\n\nTwee.\n\n\n'), ['Een regel.', 'Twee.']);
});

test('startbeurt met beelden: portret en openingsbeeld klaargezet', () => {
  const adv = newAdventure(world, hero, 1, 'adv-7');
  const next = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3, true);
  assert.equal(next.hero.heroLook, 'lanky teen in a red hoodie');
  assert.equal(next.portrait?.status, 'pending');
  assert.equal(next.portrait?.kind, 'portrait');
  assert.equal(next.turns[0].image?.status, 'pending');
  assert.equal(picturesOf(next).length, 2);
});

test('zonder beelden: alleen de scène bewaren, later alsnog "Toon scène"', () => {
  const adv = newAdventure(world, hero, 1, 'adv-8');
  const next = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3, false);
  assert.equal(next.portrait, undefined);
  assert.equal(next.turns[0].image, undefined);
  assert.equal(next.turns[0].scene?.prompt, 'A rooftop at night.');
  const asked = requestPicture(next, next.turns[0].id, 4);
  assert.equal(asked.turns[0].image?.status, 'pending');
  const done = updatePicture(asked, asked.turns[0].image!.id, { status: 'ok', uri: 'file://x.jpg' });
  assert.equal(done.turns[0].image?.uri, 'file://x.jpg');
  // Een gelukt beeld wordt niet opnieuw gemaakt.
  assert.equal(requestPicture(done, done.turns[0].id, 5).turns[0].image?.uri, 'file://x.jpg');
});

test('gewone beurt zonder show: geen beeld, actie wel als scène', () => {
  const adv = newAdventure(world, hero, 1, 'adv-9');
  const a = parseAnswer(raw({ image: { show: false, kind: 'action', prompt: 'Hero hurls a fireball.', fallback: 'Hero in a hall.' } }))!;
  const next = applyAnswer(adv, makePending('turn', 'vuurbal', 2), a, 3, true);
  assert.equal(next.turns[0].image, undefined);
  assert.equal(next.turns[0].scene?.kind, 'action');
});

test('stijl per setting en geen tekst in beelden', () => {
  const p = styledPrompt('superhelden', 'A hero leaps.');
  assert.match(p, /^A hero leaps\. dynamic comic book art/);
  assert.match(p, /no text/);
});

test('dagteller begint om 00:00 UTC opnieuw', () => {
  const day1 = Date.parse('2026-10-01T22:30:00Z');
  const day2 = Date.parse('2026-10-02T00:10:00Z');
  const c = { day: '2026-10-01', count: 150, exhausted: false };
  assert.equal(canMakeImage(c, 150, day1), false);
  assert.equal(canMakeImage(c, 150, day2), true);
  assert.equal(imagesUsed({ day: '2026-10-01', count: 3, exhausted: true }, day2).exhausted, false);
});

test('superheldenwoorden worden uit beeldprompts gehaald', () => {
  assert.equal(
    defuse('A young man in a red suit with lightning emblem at an apartment window.'),
    'A young man in a red jacket at an apartment window.',
  );
  assert.equal(
    defuse('A young speedster in a red suit with lightning emblem and gold accents stands at a window'),
    'A young person in a red jacket and gold accents stands at a window',
  );
  assert.equal(defuse('athletic build, red full-body speedster suit with gold lightning bolt emblem'), 'athletic build, red jacket');
  const d = defuse('A masked vigilante in a black cape and full-body costume with a bat symbol on his chest');
  assert.doesNotMatch(d, /mask|vigilante|cape|costume|symbol|bat/i);
  assert.equal(defuse('A quiet rooftop at dusk.'), 'A quiet rooftop at dusk.');
});

test('beeldpogingen: geen dubbele prompts', () => {
  assert.deepEqual(promptAttempts({ kind: 'portrait', prompt: 'A quiet rooftop.', fallback: 'A quiet rooftop.' }), ['A quiet rooftop.']);
  const tries = promptAttempts({ kind: 'action', prompt: 'A speedster on a roof.', fallback: 'A roof.' }, 'superhelden', 'Dak van het stadhuis');
  assert.equal(tries.length, 4); // de prompt + 3 andere
  assert.match(tries[3], /Dak van het stadhuis, in a modern big city, empty, no people/);
  // Bij een portret geen sfeerbeeld van de plek.
  assert.equal(promptAttempts({ kind: 'portrait', prompt: 'A speedster.', fallback: 'A calm face.' }).length, 3);
});
