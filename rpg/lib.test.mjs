import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, extractJson, parseCliOutput, pendingIds, renderRequest, validId } from './lib.mjs';

const world = { setting: 'Superhelden', tones: ['Humoristisch', 'Rauw'], wishes: 'geen spinnen' };
const hero = { name: 'Bliksem Bas', className: 'Speedster', powers: 'supersnel, maar altijd honger', heroLook: 'lanky teen in a red hoodie' };

test('start-verzoek: wereld, held en beginstaat, geen verhaal of actie', () => {
  const state = { hp: 20, maxHp: 20, gold: 10, level: 1, location: '', attributes: [], inventory: [], quests: [] };
  const t = renderRequest({ kind: 'start', world, hero, state, roll: 7 });
  assert.match(t, /Turn type: start/);
  assert.match(t, /Superhelden/);
  assert.match(t, /Humoristisch \+ Rauw/);
  assert.match(t, /geen spinnen/);
  assert.match(t, /supersnel, maar altijd honger/);
  assert.match(t, /heroLook for pictures \(reuse it\): lanky teen in a red hoodie/);
  assert.match(t, /d20 roll for this turn: 7/);
  assert.match(t, /Starting state/);
  assert.match(t, /- gold: 10/);
  assert.match(t, /- inventory: empty/);
  assert.doesNotMatch(t, /Story so far/);
  assert.doesNotMatch(t, /The player does now/);
});

test('beurt-verzoek: staat, recente beurten en actie', () => {
  const t = renderRequest({
    kind: 'turn',
    world,
    hero,
    state: {
      hp: 14,
      maxHp: 20,
      gold: 3,
      level: 2,
      location: 'Dak van het stadhuis',
      attributes: [{ name: 'Snelheid', value: 5 }],
      inventory: ['Energiereep'],
      quests: [{ title: 'Vind de dief', detail: 'Hij stal de taart', done: false }, { title: 'Oud', detail: 'klaar', done: true }],
    },
    summary: 'Bas rende door de stad.',
    recent: [{ action: 'Ik ren', narration: 'Je rent.' }],
    action: 'Ik spring van het dak',
    roll: 18,
  });
  assert.match(t, /hit points: 14 of 20/);
  assert.match(t, /regen\): none/);
  assert.match(t, /Snelheid 5/);
  assert.match(t, /Energiereep/);
  assert.match(t, /"Vind de dief"/);
  assert.doesNotMatch(t, /"Oud"/);
  assert.match(t, /Player: Ik ren/);
  assert.match(t, /Ik spring van het dak/);
  assert.match(t, /d20 roll for this turn: 18/);
});

test('ongeldige worp wordt 10', () => {
  assert.match(renderRequest({ kind: 'start', world, hero }), /d20 roll for this turn: 10/);
});

test('lengte van de tekst: normaal is de standaard, kort en uitgebreid kloppen', () => {
  assert.match(renderRequest({ kind: 'start', world, hero }), /narration length per turn: 60–120 words/);
  assert.match(renderRequest({ kind: 'start', world: { ...world, textLength: 'kort' }, hero }), /narration length per turn: 30–70 words/);
  assert.match(renderRequest({ kind: 'start', world: { ...world, textLength: 'uitgebreid' }, hero }), /narration length per turn: 110–200 words/);
});

test('lengte van het avontuur: opening, onderweg, laatste beurten en het einde', () => {
  const turn = (n, total = 12) => renderRequest({ kind: 'turn', world, hero, pacing: { turn: n, total }, action: 'x' });
  assert.match(renderRequest({ kind: 'start', world, hero, pacing: { turn: 0, total: 12 } }), /about 12 turns[\s\S]*this is the opening/);
  assert.match(turn(3), /turn 3 of about 12/);
  assert.doesNotMatch(turn(3), /THE END IS DUE|last third|turns left/);
  assert.match(turn(8), /last third/);
  assert.match(turn(10), /2 turns left after this one: you are in the climax/);
  assert.match(turn(11), /ONE turn left/);
  assert.match(turn(12), /THE END IS DUE/);
  assert.match(turn(15), /THE END IS DUE/); // te laat: het einde blijft "nu"
});

test('einde tijdens het spelen gekozen: voortgang telt vanaf dat moment', () => {
  const turn = (n, total, from) => renderRequest({ kind: 'turn', world, hero, pacing: { turn: n, total, from }, action: 'x' });
  // Bij beurt 40 gekozen: nog 20 beurten. Direct daarna is het verhaal nog niet "in het laatste derde".
  const t = turn(41, 60, 40);
  assert.match(t, /decided at turn 40 that the story should end at turn 60/);
  assert.match(t, /turn 41 of about 60/);
  assert.doesNotMatch(t, /last third|THE END IS DUE/);
  assert.match(turn(52, 60, 40), /last third/); // 12 van 20 beurten gespeeld
  assert.match(turn(58, 60, 40), /2 turns left after this one/);
  assert.match(turn(60, 60, 40), /THE END IS DUE/);
  // Vanaf de start (from 0) geen "decided"-regel.
  assert.doesNotMatch(turn(5, 12, 0), /decided at turn/);
});

test('verhaal hervat na het einde: aparte instructie, ook bij een gevallen held', () => {
  const base = { kind: 'turn', world, hero, pacing: { turn: 6, total: null, from: 5 }, action: 'Het verhaal gaat toch door.' };
  const won = renderRequest({ ...base, resumed: { died: false } });
  assert.match(won, /The story had ended and the player chose to continue/);
  assert.match(won, /The last turn below was the ending\./);
  assert.doesNotMatch(won, /hero fell/);
  const died = renderRequest({ ...base, resumed: { died: true } });
  assert.match(died, /the hero fell/);
  assert.match(died, /alive again/);
  assert.doesNotMatch(renderRequest(base), /chose to continue/);
});

test('onbeperkt avontuur (of oud avontuur): de verteller rondt zelf niets af', () => {
  const t = renderRequest({ kind: 'turn', world, hero, pacing: { turn: 40, total: null }, action: 'x' });
  assert.match(t, /no fixed length/);
  assert.doesNotMatch(t, /THE END IS DUE/);
  assert.match(renderRequest({ kind: 'turn', world, hero, action: 'x' }), /no fixed length/); // verzoek zonder pacing
});

const answer = { title: '', narration: 'Je rent.', choices: ['a', 'b', 'c'] };

test('classify: structured output is ok', () => {
  const r = classify({ subtype: 'success', is_error: false, structured_output: answer }, '', 0);
  assert.equal(r.status, 'ok');
  assert.equal(r.answer.narration, 'Je rent.');
});

test('classify: JSON in tekst als vangnet', () => {
  const r = classify({ subtype: 'success', result: '```json\n' + JSON.stringify(answer) + '\n```' }, '', 0);
  assert.equal(r.status, 'ok');
});

test('classify: limiet en token', () => {
  assert.equal(classify(null, "You've reached your usage limit · resets 6pm", 1).status, 'limiet');
  assert.equal(classify(null, 'Invalid bearer token', 1).status, 'token');
  assert.equal(classify(null, 'iets anders', 1).status, 'fout');
});

test('extractJson weigert JSON zonder verteltekst', () => {
  assert.equal(extractJson('{"items": []}'), null);
});

test('parseCliOutput pakt de laatste JSON-regel', () => {
  assert.deepEqual(parseCliOutput('log\n{"a":1}'), { a: 1 });
});

test('validId en pendingIds', () => {
  assert.equal(validId('abc-123'), true);
  assert.equal(validId('../x'), false);
  const now = Date.parse('2026-10-01T12:00:00Z');
  const reqs = [
    { id: 'bb-2', createdAt: '2026-10-01T11:59:00Z' },
    { id: 'aa-1', createdAt: '2026-10-01T11:58:00Z' },
    { id: 'oud-1', createdAt: '2026-10-01T10:00:00Z' },
    { id: 'klaar', createdAt: '2026-10-01T11:59:30Z' },
  ];
  assert.deepEqual(pendingIds(reqs, new Set(['klaar']), now), ['aa-1', 'bb-2']);
});

test('cast en beelden gaan mee in het beurt-verzoek', () => {
  const base = { kind: 'turn', world, hero, state: { hp: 10, maxHp: 20 }, summary: 's', action: 'a', roll: 5 };
  const t = renderRequest({
    ...base,
    cast: [{ name: 'Maren', look: 'elderly woman in her seventies' }],
    recent: [{ action: 'Ik kijk', narration: 'Je kijkt.', picture: 'An old woman by the fire.' }],
  });
  assert.match(t, /## Cast/);
  assert.match(t, /- Maren: elderly woman in her seventies/);
  assert.match(t, /Picture shown: An old woman by the fire\./);
  assert.doesNotMatch(t, /Earlier pictures/);
  const old = renderRequest({ ...base, cast: [], earlierPictures: ['An elderly woman at a well.'] });
  assert.match(old, /- nobody yet/);
  assert.match(old, /Earlier pictures[^\n]*\n- An elderly woman at a well\./);
  assert.doesNotMatch(renderRequest({ kind: 'start', world, hero }), /## Cast/);
});

test('gekregen krachten gaan mee; oud avontuur vraagt om aanvullen', () => {
  const base = { kind: 'turn', world, hero, summary: 's', action: 'a', roll: 5 };
  const t = renderRequest({ ...base, state: { traits: [{ name: 'Windkracht', kind: 'kracht', detail: 'Windstoten' }, { name: 'Bang', kind: 'zwakte', detail: '' }] } });
  assert.match(t, /gained in the story: Windkracht \(power: Windstoten\); Bang \(weakness\)/);
  assert.match(renderRequest({ ...base, state: {} }), /not recorded yet \(older adventure/);
  assert.match(renderRequest({ ...base, state: { traits: [] } }), /gained in the story: none/);
  assert.doesNotMatch(renderRequest({ kind: 'start', world, hero, state: {} }), /gained in the story/);
});
