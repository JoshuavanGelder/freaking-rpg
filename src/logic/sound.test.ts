import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { applyAnswer, buildRequest, makePending, newAdventure, parseAnswer } from './game.ts';
import { currentAmbience, currentMood, parseSound, planSound, SMALL_TURN_WORDS, wordCount, type SoundFacts } from './sound.ts';
import {
  AMBIENCES, APP_SFX, AUTO_SFX, CLAUDE_SFX, MOODS, VARIANTS,
  ambienceFile, isAmbience, isClaudeSfx, moodFile, sfxFile,
} from './soundTags.ts';
import type { Turn, World } from './types.ts';

const here = new URL('.', import.meta.url).pathname;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const registry = JSON.parse(read('../../rpg/sounds.json'));
const schema = JSON.parse(read('../../rpg/schema.json'));

const facts = (over: Partial<SoundFacts> = {}): SoundFacts => ({
  kind: 'turn', words: 90, damaged: false, healed: false, died: false, ended: false,
  levelUp: false, newTrait: false, questDone: false, itemGained: false, goldGained: false, ...over,
});
const none = { ambience: '', mood: '', sfx: [] } as const;
const turnWith = (sfx: string[], over: Partial<Turn> = {}) => ({ id: 't', action: 'x', narration: '', choices: [], notes: [], at: 0, sound: { ambience: '', mood: '', sfx }, ...over }) as Turn;

// ---------- de lijst klopt overal ----------

test('de tags in de app zijn precies die in rpg/sounds.json', () => {
  assert.deepEqual([...CLAUDE_SFX], registry.sfx.claude);
  assert.deepEqual([...AUTO_SFX], registry.sfx.auto);
  assert.deepEqual([...APP_SFX], registry.sfx.app);
  assert.deepEqual([...AMBIENCES], registry.ambience);
  assert.deepEqual([...MOODS], registry.moods);
  assert.deepEqual(VARIANTS, registry.variants);
});

test('elk geluid heeft een bestand en een regel in soundFiles.ts', () => {
  const ts = read('../soundFiles.ts');
  const names = [
    ...registry.sfx.claude, ...registry.sfx.auto, ...registry.sfx.app,
    ...registry.ambience.map((a: string) => `amb_${a}`),
    ...registry.moods.map((m: string) => `music_${m}`),
    ...Object.entries(registry.variants as Record<string, string[]>).flatMap(([pack, tags]) => tags.map((t) => `${t}__${pack}`)),
  ];
  for (const n of names) {
    assert.ok(existsSync(new URL(`../../assets/sounds/${n}.ogg`, import.meta.url)), `bestand ontbreekt: ${n}`);
    assert.ok(ts.includes(`'${n}': require('../assets/sounds/${n}.ogg')`), `soundFiles.ts mist: ${n}`);
  }
  // En andersom: geen weesbestanden die nergens in de lijst staan.
  assert.equal((ts.match(/: require\(/g) ?? []).length, names.length);
  void here;
});

test('het schema van de verteller noemt dezelfde tags', () => {
  const sound = schema.properties.sound.properties;
  assert.deepEqual(sound.sfx.items.enum, registry.sfx.claude);
  assert.deepEqual(sound.ambience.enum, ['', 'stop', ...registry.ambience]);
  assert.deepEqual(sound.mood.enum, ['', ...registry.moods]);
  assert.ok(schema.required.includes('sound'));
  assert.deepEqual(schema.properties.sound.required, ['ambience', 'mood', 'sfx']);
});

test('de prompt van de verteller noemt elke keuzemogelijkheid', () => {
  const prompt = read('../../rpg/prompt.md');
  for (const tag of [...registry.sfx.claude, ...registry.ambience, ...registry.moods]) {
    assert.ok(new RegExp(`\\b${tag}\\b`).test(prompt), `prompt noemt ${tag} niet`);
  }
  // Effecten van de app zelf horen er niet als keuze in.
  const choices = prompt.slice(prompt.indexOf('Pick from:'), prompt.indexOf('Pick from:') + 700);
  for (const tag of registry.sfx.auto) assert.ok(!choices.includes(tag), `${tag} hoort niet bij de keuzes`);
});

test('bestandsnaam: variant van de setting of het standaardgeluid', () => {
  assert.equal(sfxFile('gunshot', 'western'), 'gunshot');
  assert.equal(sfxFile('gunshot', 'scifi'), 'gunshot__scifi');
  assert.equal(sfxFile('laser', 'scifi'), 'laser');
  assert.equal(sfxFile('footsteps', 'horror'), 'footsteps__horror');
  assert.equal(sfxFile('footsteps', 'eigen'), 'footsteps');
  assert.equal(ambienceFile('cave'), 'amb_cave');
  assert.equal(moodFile('triumph'), 'music_triumph');
});

// ---------- antwoord van de verteller ----------

test('parseSound: onbekende tags verdwijnen, hooguit twee effecten, geen dubbelen', () => {
  const s = parseSound({ ambience: 'cave', mood: 'tense', sfx: ['fireball', 'bestaat_niet', 'fireball', 'door_slam', 'laser'] });
  assert.deepEqual(s, { ambience: 'cave', mood: 'tense', sfx: ['fireball', 'door_slam'] });
  assert.deepEqual(parseSound({ ambience: 'stop' }).ambience, 'stop');
  assert.deepEqual(parseSound({ ambience: 'nonsens', mood: 7, sfx: 'x' }), none);
  assert.deepEqual(parseSound(null), none);
  assert.deepEqual(parseSound(undefined), none);
  // De effecten van de app zelf kan de verteller niet kiezen.
  assert.deepEqual(parseSound({ sfx: ['heal', 'damage_taken', 'death_sting'] }).sfx, []);
  assert.ok(isAmbience('tavern') && !isAmbience('stop') && isClaudeSfx('hit') && !isClaudeSfx('heal'));
  assert.equal(wordCount('  een twee\n drie '), 3);
});

// ---------- planSound ----------

test('opening: alleen het startgeluid', () => {
  assert.deepEqual(planSound({ ambience: 'tavern', mood: 'calm', sfx: ['laugh'] }, facts({ kind: 'start' })), { ambience: 'tavern', mood: 'calm', sfx: ['adventure_start'] });
});

test('oorzaak eerst, dan gevolg; hooguit twee', () => {
  const p = planSound({ ambience: '', mood: 'action', sfx: ['sword_hit', 'door_slam'] }, facts({ damaged: true, goldGained: true }));
  assert.deepEqual(p.sfx, ['sword_hit', 'damage_taken']);
  assert.equal(p.mood, 'action');
  assert.equal(p.soft, undefined);
  assert.deepEqual(planSound({ ambience: '', mood: '', sfx: ['fireball', 'explosion'] }, facts()).sfx, ['fireball', 'explosion']);
});

test('gevolg van de held komt uit de staat: schade, heling, kracht', () => {
  assert.deepEqual(planSound(none, facts({ damaged: true })).sfx, ['damage_taken']);
  assert.deepEqual(planSound(none, facts({ healed: true })).sfx, ['heal']);
  assert.deepEqual(planSound(none, facts({ levelUp: true })).sfx, ['power_up']);
  assert.deepEqual(planSound(none, facts({ newTrait: true })).sfx, ['power_up']);
  // Schade gaat voor heling als beide gebeuren.
  assert.deepEqual(planSound(none, facts({ damaged: true, healed: true })).sfx, ['damage_taken']);
});

test('spullen, goud en quests alleen als er plek is', () => {
  assert.deepEqual(planSound(none, facts({ questDone: true, itemGained: true, goldGained: true })).sfx, ['quest_done', 'item_pickup']);
  assert.deepEqual(planSound({ ambience: '', mood: '', sfx: ['chest_open'] }, facts({ itemGained: true })).sfx, ['chest_open', 'item_pickup']);
  assert.deepEqual(planSound({ ambience: '', mood: '', sfx: ['chest_open'] }, facts({ damaged: true, itemGained: true })).sfx, ['chest_open', 'damage_taken']);
});

test('dood en einde', () => {
  assert.deepEqual(planSound({ ambience: '', mood: 'sad', sfx: ['monster_growl'] }, facts({ ended: true, died: true, damaged: true })).sfx, ['monster_growl', 'death_sting']);
  assert.deepEqual(planSound(none, facts({ ended: true, died: true })).sfx, ['death_sting']);
  assert.deepEqual(planSound(none, facts({ ended: true })).sfx, ['adventure_end']);
  assert.deepEqual(planSound({ ambience: '', mood: 'triumph', sfx: ['victory'] }, facts({ ended: true })).sfx, ['victory']);
});

test('geen herhaling van het effect van de vorige beurt', () => {
  const prev = turnWith(['footsteps']);
  assert.deepEqual(planSound({ ambience: '', mood: '', sfx: ['footsteps', 'door_creak'] }, facts(), prev).sfx, ['door_creak']);
  // Schade mag wel twee beurten achter elkaar.
  assert.deepEqual(planSound(none, facts({ damaged: true }), turnWith(['damage_taken'])).sfx, ['damage_taken']);
});

test('kleine acties: hooguit één zacht geluid, tenzij er echt iets met de held gebeurt', () => {
  const small = facts({ words: SMALL_TURN_WORDS });
  const p = planSound({ ambience: '', mood: '', sfx: ['water_splash', 'laugh'] }, small);
  assert.deepEqual(p.sfx, ['water_splash']);
  assert.equal(p.soft, true);
  assert.deepEqual(planSound(none, small).sfx, []);
  assert.equal(planSound(none, small).soft, true);
  // Eten dat genezing geeft is wel een gebeurtenis.
  const healed = planSound(none, facts({ words: 20, healed: true }));
  assert.deepEqual(healed.sfx, ['heal']);
  assert.equal(healed.soft, undefined);
  assert.equal(planSound(none, facts({ words: SMALL_TURN_WORDS + 1 })).soft, undefined);
});

// ---------- wat nu klinkt ----------

test('ambience en stemming blijven staan tot een beurt ze verandert', () => {
  const t = (ambience: any, mood: any): Turn => turnWith([], { sound: { ambience, mood, sfx: [] } });
  assert.equal(currentAmbience([]), null);
  assert.equal(currentAmbience([t('cave', 'calm'), t('', ''), t('', 'tense')]), 'cave');
  assert.equal(currentMood([t('cave', 'calm'), t('', ''), t('', 'tense')]), 'tense');
  assert.equal(currentAmbience([t('cave', ''), t('stop', '')]), null);
  assert.equal(currentAmbience([t('stop', ''), t('tavern', '')]), 'tavern');
  assert.equal(currentAmbience([{ ...turnWith([]), sound: undefined }]), null); // beurt van vóór het geluid
});

// ---------- door het hele spel heen ----------

const world: World = { setting: 'fantasy', settingText: '', tones: ['Episch'], toneText: '', wishes: '' };
const hero = { name: 'Mira', className: 'Boogschutter', powers: '', looks: '' };
const raw = (over: Record<string, any> = {}) => ({
  title: 'Het Woud', narration: 'Je stapt het woud in. '.repeat(10), choices: ['a', 'b', 'c'],
  check: { used: false, attribute: '', dc: 0, success: true }, attributes: [{ name: 'Behendigheid', value: 4 }],
  changes: { hp: 0, heal: '', regen: '', gold: 0, xp: 0, addItems: [], removeItems: [], addQuests: [], completeQuests: [], location: 'Woud', addTraits: [], removeTraits: [] },
  summary: 's', gameOver: false, image: { show: false, kind: 'scene', prompt: '', fallback: '' }, heroLook: 'x', portrait: 'y',
  cast: [], canon: { places: [], facts: [], forgetFacts: [], time: '' },
  sound: { ambience: 'forest_day', mood: 'calm', sfx: [] },
  ...over,
});

test('antwoord zonder geluidsdeel (oude verteller) geeft een stille beurt zonder fout', () => {
  const { sound: _gone, ...old } = raw();
  const a = parseAnswer(old);
  assert.ok(a);
  assert.deepEqual(a.sound, none);
});

test('applyAnswer: geluid van de verteller en van de staat komen op de beurt', () => {
  let adv = newAdventure(world, hero, 1, 'adv-s');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  assert.deepEqual(adv.turns[0].sound, { ambience: 'forest_day', mood: 'calm', sfx: ['adventure_start'] });
  assert.equal(currentAmbience(adv.turns), 'forest_day');

  // Een gevecht: pijl van de verteller, schade uit de staat.
  const hit = raw({
    narration: 'Een pijl suist langs je oor en blijft in je schouder steken. '.repeat(4),
    changes: { ...raw().changes, hp: -3, location: '' },
    sound: { ambience: '', mood: 'action', sfx: ['arrow'] },
  });
  adv = applyAnswer(adv, makePending('turn', 'ren', 4), parseAnswer(hit)!, 5);
  assert.deepEqual(adv.turns[1].sound, { ambience: '', mood: 'action', sfx: ['arrow', 'damage_taken'] });
  assert.equal(currentAmbience(adv.turns), 'forest_day');
  assert.equal(currentMood(adv.turns), 'action');
});

test('applyAnswer: item, level en kleine actie', () => {
  let adv = newAdventure(world, hero, 1, 'adv-t');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  const eat = raw({
    narration: 'Je eet het brood. Het smaakt naar thuis.',
    changes: { ...raw().changes, addItems: ['Brood'], location: '' },
    sound: { ambience: '', mood: '', sfx: [] },
  });
  adv = applyAnswer(adv, makePending('turn', 'eet brood', 4), parseAnswer(eat)!, 5);
  assert.deepEqual(adv.turns[1].sound, { ambience: '', mood: '', sfx: ['item_pickup'], soft: true });
  const lvl = raw({ changes: { ...raw().changes, xp: 30, location: '' }, sound: { ambience: '', mood: '', sfx: [] } });
  adv = applyAnswer({ ...adv, state: { ...adv.state, xp: 80 } }, makePending('turn', 'vecht', 6), parseAnswer(lvl)!, 7); // 80 + 30 xp = level 2
  assert.deepEqual(adv.turns[2].sound?.sfx, ['power_up']);
});

test('applyAnswer: dood geeft de doodsgeluiden, einde zonder dood het eindgeluid', () => {
  let adv = newAdventure(world, hero, 1, 'adv-u');
  adv = applyAnswer(adv, makePending('start', null, 2), parseAnswer(raw())!, 3);
  const dead = raw({ changes: { ...raw().changes, hp: -10, location: '' }, gameOver: true, sound: { ambience: '', mood: 'sad', sfx: ['monster_growl'] } });
  const died = applyAnswer({ ...adv, state: { ...adv.state, hp: 4 } }, makePending('turn', 'x', 4), parseAnswer(dead)!, 5);
  assert.deepEqual(died.turns[1].sound?.sfx, ['monster_growl', 'death_sting']);
  assert.equal(died.ended, true);
  const win = raw({ gameOver: true, sound: { ambience: '', mood: 'triumph', sfx: [] } });
  const done = applyAnswer(adv, makePending('turn', 'x', 4), parseAnswer(win)!, 5);
  assert.deepEqual(done.turns[1].sound?.sfx, ['adventure_end']);
});

test('verzoek: geluid alleen mee als de speler het aan heeft, met wat er nu klinkt', () => {
  let adv = newAdventure(world, hero, 1, 'adv-v');
  const p = makePending('start', null, 2);
  assert.equal(buildRequest(adv, p, 'sonnet').sound, undefined);
  assert.deepEqual(buildRequest(adv, p, 'sonnet', undefined, true).sound, { ambience: null, mood: null });
  adv = applyAnswer(adv, p, parseAnswer(raw())!, 3);
  const next = buildRequest(adv, makePending('turn', 'x', 4), 'sonnet', undefined, true);
  assert.deepEqual(next.sound, { ambience: 'forest_day', mood: 'calm' });
});
