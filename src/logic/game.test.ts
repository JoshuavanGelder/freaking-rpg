import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnswer,
  dropTraitByHand,
  finishQuestByHand,
  matchIndex,
  canMakeImage,
  defuse,
  promptAttempts,
  imagesUsed,
  picturesOf,
  requestPicture,
  styledPrompt,
  updatePicture,
  buildRequest,
  healAmount,
  heroProblem,
  makePending,
  mergeCast,
  newAdventure,
  paragraphs,
  parseAnswer,
  regenAmount,
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

const withChanges = (over: Record<string, any>) =>
  parseAnswer(raw({ changes: { hp: 0, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '', ...over } }))!;

test('heling is een maat: klein, groot en volledig rekent de app uit', () => {
  const base = newAdventure(world, hero, 1, 'adv-heal');
  const hurt = (hp: number) => ({ ...base, state: { ...base.state, hp } });
  const run = (hp: number, heal: string) => applyAnswer(hurt(hp), makePending('turn', 'x', 2), withChanges({ heal }), 3).state.hp;
  assert.equal(run(4, 'klein'), 9); // 25% van 20 = 5
  assert.equal(run(4, 'groot'), 16); // 60% van 20 = 12
  assert.equal(run(4, 'volledig'), 20);
  assert.equal(run(15, 'groot'), 20); // nooit boven het maximum
  assert.equal(run(4, ''), 4);
  assert.equal(run(4, 'onzin'), 4); // onbekende maat telt niet
});

test('heling gaat voor een positieve hp-wijziging, schade telt wel mee', () => {
  const base = newAdventure(world, hero, 1, 'adv-heal-2');
  const adv = { ...base, state: { ...base.state, hp: 10 } };
  // De verteller zet per ongeluk hp op +10 én heal: alleen de maat telt.
  assert.equal(applyAnswer(adv, makePending('turn', 'x', 2), withChanges({ hp: 10, heal: 'klein' }), 3).state.hp, 15);
  // Schade en heling in dezelfde beurt: eerst de klap, dan de heling.
  assert.equal(applyAnswer(adv, makePending('turn', 'x', 2), withChanges({ hp: -6, heal: 'klein' }), 3).state.hp, 9);
});

test('volledig herstel na schade in dezelfde beurt', () => {
  const base = newAdventure(world, hero, 1, 'adv-heal-3');
  const adv = { ...base, state: { ...base.state, hp: 2 } };
  const next = applyAnswer(adv, makePending('turn', 'x', 2), withChanges({ hp: -8, heal: 'volledig' }), 3);
  assert.equal(next.state.hp, 20);
  assert.equal(next.ended, false);
});

test('healAmount en regenAmount', () => {
  assert.equal(healAmount('', 20), 0);
  assert.equal(healAmount('klein', 20), 5);
  assert.equal(healAmount('klein', 3), 1);
  assert.equal(healAmount('groot', 22), 14);
  assert.equal(healAmount('volledig', 22), 22);
  assert.equal(regenAmount(undefined, 20), 0);
  assert.equal(regenAmount('traag', 20), 2);
  assert.equal(regenAmount('snel', 20), 5);
  assert.equal(regenAmount('traag', 4), 1);
});

test('zelfherstel: alleen als het verhaal het geeft, en alleen op rustige beurten', () => {
  const base = newAdventure(world, hero, 1, 'adv-regen');
  const adv = { ...base, state: { ...base.state, hp: 10 } };
  // Zonder regen verandert er niets.
  assert.equal(applyAnswer(adv, makePending('turn', 'x', 2), withChanges({}), 3).state.hp, 10);
  // De verteller geeft de held zelfherstel (bv. een trol) en het blijft bewaard in de staat.
  const gained = applyAnswer(adv, makePending('turn', 'x', 2), withChanges({ regen: 'snel' }), 3);
  assert.equal(gained.state.regen, 'snel');
  assert.equal(gained.state.hp, 15);
  // Volgende rustige beurt: nog eens, begrensd op het maximum.
  const calm = applyAnswer(gained, makePending('turn', 'x', 4), withChanges({}), 5);
  assert.equal(calm.state.hp, 20);
  assert.equal(calm.state.regen, 'snel');
  // Op een beurt met schade geen zelfherstel.
  const hit = applyAnswer(gained, makePending('turn', 'x', 4), withChanges({ hp: -3 }), 5);
  assert.equal(hit.state.hp, 12);
  // Bij de start telt het niet mee.
  const start = applyAnswer(base, makePending('start', null, 2), withChanges({ regen: 'traag' }), 3);
  assert.equal(start.state.hp, 20);
  assert.equal(start.state.regen, 'traag');
  // 'geen' haalt het weer weg.
  const lost = applyAnswer(gained, makePending('turn', 'x', 4), withChanges({ regen: 'geen' }), 5);
  assert.equal(lost.state.regen, undefined);
  assert.equal(lost.state.hp, 15); // geen zelfherstel meer op deze beurt
});

test('zelfherstel haalt je niet terug uit de dood', () => {
  const base = newAdventure(world, hero, 1, 'adv-regen-2');
  const adv = { ...base, state: { ...base.state, hp: 3, regen: 'snel' as const } };
  const next = applyAnswer(adv, makePending('turn', 'x', 2), withChanges({ hp: -8 }), 3);
  assert.equal(next.state.hp, 0);
  assert.equal(next.ended, true);
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

test('cast: nieuwe bijpersonen bewaard, zelfde naam bijgewerkt, held niet', () => {
  let adv = newAdventure(world, hero, 1, 'adv-cast');
  assert.equal(adv.cast, undefined);
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw({ cast: [{ name: 'Maren', look: 'elderly woman in her seventies, hunched, grey braid' }, { name: 'Bliksem Bas', look: 'x' }, { name: '', look: 'y' }] }))!, 3);
  assert.deepEqual(adv.cast, [{ name: 'Maren', look: 'elderly woman in her seventies, hunched, grey braid' }]);
  adv = applyAnswer(adv, makePending('turn', 'Ik praat', 4), parseAnswer(raw({ cast: [{ name: 'maren', look: 'elderly woman in her seventies, grey braid, black mourning shawl' }] }))!, 5);
  assert.equal(adv.cast!.length, 1);
  assert.equal(adv.cast![0].name, 'Maren');
  assert.match(adv.cast![0].look, /mourning shawl/);
  adv = applyAnswer(adv, makePending('turn', 'Ik loop', 6), parseAnswer(raw())!, 7);
  assert.equal(adv.cast!.length, 1);
  assert.equal(mergeCast([], Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, look: 'l' }))).length, 24);
});

test('verzoek: cast, beeldprompts bij recente beurten en eenmalig eerdere beelden', () => {
  let adv = newAdventure(world, hero, 1, 'adv-req');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw({ image: { show: true, kind: 'character', prompt: 'An elderly woman with a grey braid at a well.', fallback: 'A well.' } }))!, 3, true);
  for (let i = 0; i < 7; i++) adv = applyAnswer(adv, makePending('turn', `Actie ${i}`, 10 + i), parseAnswer(raw({ image: { show: false, kind: 'scene', prompt: 'x', fallback: 'y' } }))!, 20 + i, true);
  // Oud avontuur nabootsen: nog nooit een cast gehad.
  const old = { ...adv, cast: undefined };
  const r1 = buildRequest(old, makePending('turn', 'Ik zoek Maren', 30), 'sonnet');
  assert.deepEqual(r1.cast, []);
  assert.deepEqual(r1.earlierPictures, ['An elderly woman with a grey braid at a well.']);
  const r2 = buildRequest({ ...adv, cast: [{ name: 'Maren', look: 'elderly woman in a superhero costume' }] }, makePending('turn', 'Ik zoek Maren', 30), 'sonnet');
  assert.equal(r2.earlierPictures, undefined);
  assert.doesNotMatch(r2.cast[0].look, /costume/);
  const withPic = applyAnswer(adv, makePending('turn', 'Kijk', 40), parseAnswer(raw())!, 41, true);
  const r3 = buildRequest(withPic, makePending('turn', 'Verder', 42), 'sonnet');
  assert.equal(r3.recent[r3.recent.length - 1].picture, 'A rooftop at night.');
  assert.equal(r3.recent[0].picture, undefined);
});

test('krachten en zwaktes uit het verhaal: erbij, bijwerken, kwijt; nieuwe eigenschap alleen als die nieuw is', () => {
  let adv = newAdventure(world, hero, 1, 'adv-traits');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  assert.deepEqual(adv.state.traits, []);
  const ch = (over: Record<string, any>) => ({ hp: 0, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '', ...over });
  adv = applyAnswer(
    adv,
    makePending('turn', 'Ik raak de steen aan', 4),
    parseAnswer(raw({
      attributes: [{ name: 'Windbeheersing', value: 2 }, { name: 'snelheid', value: 0 }],
      changes: ch({ addTraits: [{ name: 'Windkracht', kind: 'kracht', detail: 'Je stuurt windstoten.' }, { name: 'Schaduwvrees', kind: 'weakness', detail: 'Donker maakt je bang.' }, { name: '', kind: 'kracht', detail: 'x' }] }),
    }))!,
    5,
  );
  assert.deepEqual(adv.state.traits!.map((t) => `${t.kind}:${t.name}`), ['kracht:Windkracht', 'zwakte:Schaduwvrees']);
  assert.deepEqual(adv.state.attributes.map((a) => `${a.name} ${a.value}`), ['Snelheid 5', 'Uithoudingsvermogen 5', 'Windbeheersing 2']);
  assert.ok(adv.turns[1].notes.includes('Nieuwe kracht: Windkracht'));
  assert.ok(adv.turns[1].notes.includes('Nieuwe zwakte: Schaduwvrees'));
  adv = applyAnswer(adv, makePending('turn', 'Oefenen', 6), parseAnswer(raw({ changes: ch({ addTraits: [{ name: 'windkracht', kind: 'kracht', detail: 'Je kunt nu ook vliegen.' }], removeTraits: ['SCHADUWVREES'] }) }))!, 7);
  assert.equal(adv.state.traits!.length, 1);
  assert.equal(adv.state.traits![0].detail, 'Je kunt nu ook vliegen.');
  assert.deepEqual(adv.turns[2].notes, ['Zwakte kwijt: Schaduwvrees']);
});

test('matchIndex: herkent bijna-gelijke namen, maar niet bij twijfel', () => {
  const names = ['Zwarte vlam van de askroon', 'Windkracht', 'Bang voor vuur'];
  assert.equal(matchIndex(names, 'zwarte vlam van de askroon'), 0);
  assert.equal(matchIndex(names, 'Zwarte Vlam'), 0);
  assert.equal(matchIndex(names, 'De zwarte vlam van de Askroon!'), 0);
  assert.equal(matchIndex(names, 'Wind-kracht'), -1);
  assert.equal(matchIndex(names, 'Vuurvrees'), -1);
  assert.equal(matchIndex(['Vind de sleutel', 'Vind de kroon'], 'Vind de'), -1);
  assert.equal(matchIndex(names, ''), -1);
});

test('quest en kracht worden ook afgenomen/afgerond bij een licht afwijkende naam', () => {
  let adv = newAdventure(world, hero, 1, 'adv-match');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  const ch = (over: Record<string, any>) => ({ hp: 0, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '', ...over });
  adv = applyAnswer(
    adv,
    makePending('turn', 'Ik pak de kroon', 4),
    parseAnswer(raw({ changes: ch({
      addQuests: [{ title: 'Vind de askroon', detail: 'Zoek hem in de ruïne.' }],
      addTraits: [{ name: 'Zwarte vlam van de askroon', kind: 'kracht', detail: 'Zwarte vuren volgen jou.' }],
    }) }))!,
    5,
  );
  adv = applyAnswer(
    adv,
    makePending('turn', 'Ik zet de kroon op', 6),
    parseAnswer(raw({ changes: ch({ completeQuests: ['De askroon vinden'], removeTraits: ['Zwarte vlam'] }) }))!,
    7,
  );
  assert.equal(adv.state.quests.find((q) => q.title === 'Vind de askroon')!.done, true); // gedeeld kernwoord, enige open quest
  assert.equal(adv.state.traits!.length, 0);
});

test('met de hand: quest afvinken en kracht weghalen', () => {
  let adv = newAdventure(world, hero, 1, 'adv-hand');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  const ch = (over: Record<string, any>) => ({ hp: 0, gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: '', ...over });
  adv = applyAnswer(adv, makePending('turn', 'Ik kijk rond', 4), parseAnswer(raw({ changes: ch({
    addQuests: [{ title: 'Vind de askroon', detail: '' }],
    addTraits: [{ name: 'Windkracht', kind: 'kracht', detail: '' }],
  }) }))!, 5);
  adv = finishQuestByHand(adv, 'vind de askroon', 9);
  adv = dropTraitByHand(adv, 'WINDKRACHT', 10);
  assert.equal(adv.state.quests.find((q) => q.title === 'Vind de askroon')!.done, true);
  assert.deepEqual(adv.state.traits, []);
  assert.equal(finishQuestByHand(adv, 'bestaat niet'), adv);
});
