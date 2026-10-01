import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnswer,
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
