import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUsage, formatTokens, summarizeUsage } from './usage.ts';
import type { TurnResponse } from './types.ts';

const resp = (over: Partial<TurnResponse> = {}): TurnResponse => ({
  id: 'x',
  status: 'ok',
  message: 'Klaar',
  resetAt: null,
  answer: {},
  finishedAt: '2026-10-04T20:00:00Z',
  durationMs: 21400,
  model: 'sonnet',
  effort: 'low',
  usage: { input: 100, output: 900, cacheRead: 8000, cacheWrite: 400, costUsd: 0.02, apiMs: 18000, numTurns: 1 },
  ...over,
});

test('verbruik: alleen geslaagde beurten met verbruik, alles wat gelezen is telt mee, laatste 40', () => {
  assert.deepEqual(addUsage(undefined, resp({ usage: null }), 'turn'), []);
  assert.deepEqual(addUsage(undefined, resp({ status: 'fout' }), 'turn'), []);
  assert.deepEqual(addUsage(undefined, null, 'turn'), []);
  const one = addUsage(undefined, resp(), 'turn', 5);
  assert.deepEqual(one, [{ at: 5, kind: 'turn', model: 'sonnet', effort: 'low', tokensIn: 8500, tokensOut: 900, costUsd: 0.02, secs: 21 }]);
  let log = one;
  for (let i = 0; i < 50; i++) log = addUsage(log, resp(), 'turn', 10 + i);
  assert.equal(log.length, 40);
  assert.equal(addUsage(undefined, resp({ effort: null, model: undefined }), 'turn')[0].effort, 'standaard');
});

test('verbruik: gemiddelden per soort beurt en nadenkstand, openingen eerst', () => {
  let log = addUsage(undefined, resp(), 'turn', 1);
  log = addUsage(log, resp({ usage: { input: 100, output: 1100, cacheRead: 9000, cacheWrite: 400, costUsd: 0.04, apiMs: 1, numTurns: 1 }, durationMs: 31000 }), 'turn', 2);
  log = addUsage(log, resp({ effort: 'medium', usage: { input: 100, output: 3000, cacheRead: 8000, cacheWrite: 400, costUsd: null, apiMs: 1, numTurns: 1 } }), 'start', 3);
  const groups = summarizeUsage(log);
  assert.deepEqual(groups.map((g) => g.label), ['Opening · sonnet medium', 'Beurt · sonnet low']);
  assert.deepEqual(groups[1], { key: 'turn|sonnet|low', label: 'Beurt · sonnet low', count: 2, avgIn: 9000, avgOut: 1000, avgCost: 0.03, avgSecs: 26 });
  assert.equal(groups[0].avgCost, null);
  assert.deepEqual(summarizeUsage(undefined), []);
});

test('tokens leesbaar', () => {
  assert.equal(formatTokens(850), '850');
  assert.equal(formatTokens(9400), '9,4k');
  assert.equal(formatTokens(12000), '12,0k');
});
