import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGS, langOf, t, tn, tt, setCurrentLang, currentLang, isLang } from './i18n.ts';
import { ago, buildRequest, formatGold, newAdventure, applyAnswer, makePending, parseAnswer, settingOf, settingsList, toneLabel, worldLabel, worldProblem, heroProblem, storyLang, resumeAction, arcHint, textLengthLabel } from './logic/game.ts';
import { formatTokens, summarizeUsage } from './logic/usage.ts';
import { responseHealth, summarizeStatus } from './logic/status.ts';
import type { World, Hero } from './logic/types.ts';

const world: World = { setting: 'superhelden', settingText: '', tones: ['Humoristisch', 'Rauw'], toneText: '', wishes: '' };
const hero: Hero = { name: 'Fenna', className: 'Speedster', powers: '', looks: '' };

// De sleutels staan niet geëxporteerd; haal ze uit de bron van de woordenlijst (het `nl`-blok).
function allKeys(): string[] {
  const text = readFileSync(new URL('./i18n.ts', import.meta.url), 'utf8');
  const nlBlock = text.slice(text.indexOf('const nl = {'), text.indexOf('} as const;'));
  return [...nlBlock.matchAll(/^\s+'([\w.]+)':/gm)].map((m) => m[1]);
}

test('woordenlijst: Nederlands en Engels hebben dezelfde plaatsvervangers en geen lege teksten', () => {
  const keys = allKeys();
  assert.ok(keys.length > 200);
  assert.equal(new Set(keys).size, keys.length, 'dubbele sleutel');
  const ph = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of keys) {
    const nl = t('nl', k as never);
    const en = t('en', k as never);
    assert.ok(nl.trim() && en.trim(), `lege tekst bij ${k}`);
    assert.notEqual(en, k, `Engelse tekst ontbreekt bij ${k}`);
    assert.equal(ph(nl), ph(en), `plaatsvervangers verschillen bij ${k}`);
  }
});

test('t en tn: invullen, meervoud en onbekende plaatsvervangers', () => {
  assert.equal(t('nl', 'home.turn', { n: 3, ago: 'zojuist' }), 'Beurt 3 · zojuist');
  assert.equal(t('en', 'home.turn', { n: 3, ago: 'just now' }), 'Turn 3 · just now');
  assert.equal(tn('nl', 'end.left', 1), 'Einde: nog 1 beurt');
  assert.equal(tn('nl', 'end.left', 4), 'Einde: nog 4 beurten');
  assert.equal(tn('en', 'end.left', 1), 'End: 1 turn left');
  assert.equal(tn('en', 'sheet.items', 0), '0 items');
  assert.equal(t('en', 'home.turn', { n: 1 }), 'Turn 1 · {ago}');
  assert.equal(t('nl', 'usage.cost', { cost: '0,03' }), ' · ca. $0,03');
});

test('taal van de app: standaard Nederlands, tt volgt de gekozen taal', () => {
  assert.equal(langOf(undefined), 'nl');
  assert.equal(langOf('en'), 'en');
  assert.equal(langOf('fr'), 'nl');
  assert.ok(isLang('nl') && isLang('en') && !isLang('de'));
  assert.deepEqual(LANGS.map((l) => l.id), ['nl', 'en']);
  assert.equal(currentLang(), 'nl');
  assert.equal(tt('common.back'), 'Terug');
  setCurrentLang('en');
  assert.equal(tt('common.back'), 'Back');
  setCurrentLang('nl');
});

test('spellogica in het Engels: settings, tonen, controles, bedragen en tijd', () => {
  assert.equal(settingOf('superhelden', 'en').label, 'Superheroes');
  assert.equal(settingOf('superhelden').label, 'Superhelden');
  assert.equal(settingOf('bestaat-niet', 'en').id, 'eigen');
  assert.equal(settingsList('en').length, 8);
  assert.ok(settingsList('en').every((s) => s.classes.length === 4));
  assert.equal(toneLabel('Rauw', 'en'), 'Gritty');
  assert.equal(toneLabel('Iets eigens', 'en'), 'Iets eigens');
  assert.equal(worldLabel(world, 'en'), 'Superheroes · Humorous + Gritty');
  assert.equal(worldLabel(world), 'Superhelden · Humoristisch + Rauw');
  assert.equal(worldProblem({ ...world, tones: [] }, 'en'), 'Pick at least one tone.');
  assert.equal(heroProblem({ ...hero, name: '' }, 'en'), 'Give your hero a name.');
  assert.equal(formatGold(1_000_010, 'en'), '1,000,010');
  assert.equal(formatGold(-2500, 'en'), '-2,500');
  assert.equal(formatTokens(9400, 'en'), '9.4k');
  assert.equal(ago(0, 30 * 60000, 'en'), '30 min ago');
  assert.equal(ago(0, 1000, 'en'), 'just now');
  assert.equal(ago(0, 3 * 24 * 3600000, 'en'), '3 days ago');
  assert.equal(arcHint('onbeperkt', 'en'), 'The story only ends when you want it to');
  assert.equal(textLengthLabel('uitgebreid', 'en'), 'Extended');
  assert.equal(resumeAction('en'), 'The story goes on after all.');
});

test('verhaaltaal per avontuur: in het verzoek, oude avonturen blijven Nederlands', () => {
  const nl = newAdventure(world, hero, 1, 'adv-nl');
  assert.equal(nl.world.lang, undefined);
  assert.equal(storyLang(nl), 'nl');
  const r0 = buildRequest(nl, makePending('start', null, 2), 'sonnet');
  assert.equal(r0.lang, 'nl');
  assert.equal(r0.world.setting, 'Superhelden');
  assert.deepEqual(r0.world.tones, ['Humoristisch', 'Rauw']);

  const en = newAdventure({ ...world, lang: 'en' }, hero, 1, 'adv-en');
  assert.equal(en.world.lang, 'en');
  const r1 = buildRequest(en, makePending('start', null, 2), 'sonnet');
  assert.equal(r1.lang, 'en');
  assert.equal(r1.world.setting, 'Superheroes');
  assert.deepEqual(r1.world.tones, ['Humorous', 'Gritty']);
});

test('notities van een beurt volgen de taal van het avontuur', () => {
  const en = newAdventure({ ...world, lang: 'en' }, hero, 1, 'adv-en-2');
  const p = makePending('start', null, 2);
  const raw = {
    narration: 'You wake up.',
    choices: ['a', 'b', 'c'],
    changes: { xp: 10, addItems: ['Key'], addQuests: [{ title: 'Find the thief', detail: 'x' }], location: 'Town hall', addTraits: [{ name: 'Wind', kind: 'kracht', detail: 'x' }] },
  };
  const next = applyAnswer(en, p, parseAnswer(raw)!, 3);
  assert.deepEqual(next.turns[0].notes, ['+ Key', 'New quest: Find the thief', 'Location: Town hall', 'New power: Wind']);
  const nl = applyAnswer(newAdventure(world, hero, 1, 'adv-nl-2'), p, parseAnswer(raw)!, 3);
  assert.ok(nl.turns[0].notes.includes('Nieuwe quest: Find the thief'));
  assert.ok(nl.turns[0].notes.includes('Nieuwe kracht: Wind'));
});

test('verbruik en status in het Engels', () => {
  const log = [{ at: 1, kind: 'start' as const, model: 'sonnet', effort: 'medium', tokensIn: 100, tokensOut: 10, costUsd: 0.1, secs: 5 }, { at: 2, kind: 'turn' as const, model: 'haiku', effort: 'standaard', tokensIn: 100, tokensOut: 10, costUsd: null, secs: 5 }];
  assert.deepEqual(summarizeUsage(log, 'en').map((g) => g.label), ['Opening · sonnet medium', 'Turn · haiku default']);
  assert.deepEqual(summarizeUsage(log).map((g) => g.label), ['Opening · sonnet medium', 'Beurt · haiku standaard']);
  assert.equal(summarizeStatus({ components: [{ name: 'Claude Code', status: 'operational' }] }, 'en').text, 'Claude is available.');
  const h = responseHealth({ id: 'x', status: 'limiet', message: '', resetAt: '18:00', answer: null, finishedAt: new Date(1000).toISOString() }, 2000, 'en');
  assert.equal(h?.text, 'Your Claude limit is used up (available again: 18:00).');
});
