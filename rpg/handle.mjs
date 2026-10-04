// Eén beurt afhandelen: verzoek lezen, Claude Code draaien (met je abonnement via
// CLAUDE_CODE_OAUTH_TOKEN), antwoord in responses/<id>.json schrijven.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, classify, effortFor, parseCliOutput, pickUsage, renderRequest, validId } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function write(dataDir, id, started, res) {
  mkdirSync(join(dataDir, 'responses'), { recursive: true });
  const body = { id, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, ...res };
  writeFileSync(join(dataDir, 'responses', `${id}.json`), JSON.stringify(body, null, 1));
  console.log(`Antwoord ${id}: ${body.status} – ${body.message} (${Math.round(body.durationMs / 1000)} s)`);
  return body;
}

/** Handelt verzoek `id` af en schrijft het antwoord weg. Gooit nooit. */
export async function handleRequest(id, dataDir) {
  const started = Date.now();
  if (!validId(id)) throw new Error('Ongeldig verzoek-id');
  const reqPath = join(dataDir, 'requests', `${id}.json`);
  if (!existsSync(reqPath)) {
    return write(dataDir, id, started, { status: 'fout', message: 'Verzoek niet gevonden in de rpg-data-branch.', resetAt: null, answer: null });
  }
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return write(dataDir, id, started, {
      status: 'token',
      message: 'Er is nog geen Claude-token: zet het secret CLAUDE_CODE_OAUTH_TOKEN in de repo (maak het met scripts/claude-token.sh).',
      resetAt: null,
      answer: null,
    });
  }

  let request;
  try {
    request = JSON.parse(readFileSync(reqPath, 'utf8'));
  } catch {
    return write(dataDir, id, started, { status: 'fout', message: 'Het verzoek is geen geldige JSON.', resetAt: null, answer: null });
  }
  const model = MODELS.includes(request.model) ? request.model : 'sonnet';
  const prompt = renderRequest(request);
  const schema = readFileSync(join(here, 'schema.json'), 'utf8');

  // Lege werkmap: Claude hoeft niets uit de repo te lezen, en heeft geen tools nodig.
  const cwd = mkdtempSync(join(tmpdir(), 'rpg-'));
  const args = [
    '-p',
    request.kind === 'start'
      ? 'Start this new adventure. Follow your instructions exactly and answer with the structured output.'
      : "Continue the story after the player's action. Follow your instructions exactly and answer with the structured output.",
    '--output-format', 'json',
    '--json-schema', schema,
    '--model', model,
    '--system-prompt-file', join(here, 'prompt.md'),
    '--tools', '',
    '--permission-mode', 'dontAsk',
    '--max-turns', '3',
    '--no-session-persistence',
  ];
  // Korter nadenken = sneller antwoord en minder verbruik. De opening (wereld, held, eigenschappen, verhaalplan) mag
  // wel wat dieper nadenken; dat is één keer per avontuur.
  const effort = effortFor(model, request.kind);
  if (effort) args.push('--effort', effort);

  // Op de telefoon gekopieerde tokens bevatten vaak een regeleinde of spatie (het token loopt over twee
  // regels). Claude weigert dat als ongeldig, dus eerst opschonen.
  // Er mag ook extra tekst omheen staan (bv. de hele claude-token.md geplakt): we pakken het token eruit.
  const rawToken = String(process.env.CLAUDE_CODE_OAUTH_TOKEN ?? '');
  const TOKEN_RE = /sk-ant-oat01-[A-Za-z0-9_-]+/;
  // Echte tokens zijn ~108 tekens; is het gevonden stuk korter, dan zat er een regeleinde in het token.
  const direct = rawToken.match(TOKEN_RE)?.[0] ?? '';
  const token = direct.length >= 90 ? direct : (rawToken.replace(/\s+/g, '').match(TOKEN_RE)?.[0] ?? rawToken.trim());
  const env = { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token };

  return new Promise((resolve) => {
    let done = false;
    const finish = (res) => {
      if (done) return;
      done = true;
      resolve(write(dataDir, id, started, res));
    };
    const child = spawn('claude', args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.end(prompt);
    const timer = setTimeout(() => child.kill('SIGINT'), 5 * 60 * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      const out = parseCliOutput(stdout);
      const res = classify(out, `${stdout}\n${stderr}`, code ?? 1);
      if (res.status !== 'ok') {
        console.error((stderr || stdout).slice(-2000));
        // Korte melding als annotation: die is via de API te lezen.
        const said = String((out && out.result) || stderr || stdout || '').replace(/sk-ant-[A-Za-z0-9_-]+/g, '[token]');
        console.log(`::warning title=claude::${res.status}: ${said.replace(/\s+/g, ' ').slice(0, 400)}`);
      }
      const usage = pickUsage(out);
      if (usage) console.log(`::notice title=verbruik::${request.kind} ${model}/${effort ?? 'standaard'}: ${usage.input + usage.cacheRead + usage.cacheWrite} in, ${usage.output} uit${usage.costUsd !== null ? `, ca. $${usage.costUsd}` : ''}`);
      finish({ ...res, model, effort, usage });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      finish({ status: 'fout', message: `Claude Code kon niet starten: ${err.message}`, resetAt: null, answer: null });
    });
  });
}
