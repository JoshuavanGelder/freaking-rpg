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
