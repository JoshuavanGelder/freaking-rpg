import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseHealth, summarizeStatus } from './status.ts';

test('statuspagina: alles goed', () => {
  assert.equal(summarizeStatus({ components: [{ name: 'Claude Code', status: 'operational' }], incidents: [] }).level, 'ok');
});

test('statuspagina: storing', () => {
  assert.equal(summarizeStatus({ components: [{ name: 'Claude Code', status: 'major_outage' }] }).level, 'storing');
});

test('laatste beurt: limiet op', () => {
  const h = responseHealth({ id: 'x', status: 'limiet', message: '', resetAt: '18:00', answer: null, finishedAt: new Date(1000).toISOString() }, 2000);
  assert.equal(h?.level, 'storing');
  assert.match(h?.text ?? '', /18:00/);
});
