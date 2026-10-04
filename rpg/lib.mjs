// Pure hulpfuncties voor de verteller-workflow (getest met node --test rpg/lib.test.mjs).

export const MODELS = ['sonnet', 'opus', 'haiku'];

/** Alleen veilige ids: letters, cijfers en streepjes. */
export function validId(id) {
  return typeof id === 'string' && /^[a-z0-9-]{4,48}$/i.test(id);
}

const clean = (v, max = 600) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Lengte van de verteltekst per beurt, zoals de speler hem kiest. */
const NARRATION = {
  kort: '30–70 words, one or two short paragraphs. Brief and punchy: what happens and what the player decides, nothing more',
  normaal: '60–120 words',
  uitgebreid: '110–200 words, room for atmosphere and detail',
};

/** Regels over de lengte van het avontuur: waar staan we en moet het einde nu komen? */
export function pacingLines(r) {
  const total = Number(r.pacing?.total);
  const turn = Number.isInteger(r.pacing?.turn) ? r.pacing.turn : 0;
  const lines = ['## Story length'];
  if (!(total > 0)) {
    lines.push('- no fixed length: the player decides when the story ends. Do not wrap the story up or end it on your own (unless the hero dies); keep opening new possibilities.');
    return lines;
  }
  lines.push(`- the player chose a story of about ${total} turns, ending with a real conclusion.`);
  if (r.kind === 'start') {
    lines.push('- this is the opening. Plan the arc now (see "Story length and ending").');
    return lines;
  }
  const left = total - turn;
  lines.push(`- this is turn ${turn} of about ${total}.`);
  if (left <= 0) lines.push('- THE END IS DUE: this turn must be the ending. Resolve the main thread, close the open quests, write a satisfying final scene in the tone and set gameOver to true. No new cliffhanger, no choices needed.');
  else if (left === 1) lines.push('- ONE turn left after this one: this turn is the final confrontation or decision. The next turn is the ending.');
  else if (left <= 3) lines.push(`- ${left} turns left after this one: you are in the climax. Wrap up open threads and head for the final confrontation; no new big threads.`);
  else if (turn >= total * 0.6) lines.push(`- ${left} turns left: the story is in its last third. Escalate toward the climax and stop introducing new big threads.`);
  return lines;
}

/** Maakt van het verzoek (JSON van de app) een leesbaar bericht voor Claude. */
export function renderRequest(r) {
  const w = r.world ?? {};
  const h = r.hero ?? {};
  const s = r.state ?? {};
  const lines = [];
  lines.push(`# Turn type: ${r.kind === 'start' ? 'start (new adventure)' : 'turn'}`);
  lines.push('');
  lines.push('## World');
  lines.push(`- setting: ${clean(w.setting) || 'free choice'}`);
  if (clean(w.settingText)) lines.push(`- the player's own world description: ${clean(w.settingText)}`);
  lines.push(`- tone(s): ${(w.tones ?? []).map((t) => clean(t, 60)).filter(Boolean).join(' + ') || 'free choice'}`);
  if (clean(w.toneText)) lines.push(`- the player's own tone description: ${clean(w.toneText)}`);
  if (clean(w.wishes)) lines.push(`- the player's wishes: ${clean(w.wishes)}`);
  lines.push(`- narration length per turn: ${NARRATION[w.textLength] ?? NARRATION.normaal}`);
  lines.push('');
  lines.push('## Hero');
  lines.push(`- name: ${clean(h.name, 80) || 'onbekend'}`);
  lines.push(`- class or role: ${clean(h.className, 80) || 'free choice'}`);
  if (clean(h.powers)) lines.push(`- powers and weaknesses (player's words): ${clean(h.powers)}`);
  if (clean(h.looks)) lines.push(`- appearance (player's words): ${clean(h.looks)}`);
  if (clean(h.heroLook)) lines.push(`- heroLook for pictures (reuse it): ${clean(h.heroLook)}`);
  lines.push('');
  // De staat gaat altijd mee, ook bij de start: anders verzint de verteller zelf hoeveel geld de held heeft.
  lines.push(r.kind === 'start'
    ? '## Starting state (the truth; never show numbers to the player)'
    : '## Hidden state (the truth; never show numbers to the player)');
  lines.push(`- hit points: ${s.hp ?? '?'} of ${s.maxHp ?? '?'}`);
  lines.push(`- natural regeneration (regen): ${s.regen === 'traag' || s.regen === 'snel' ? s.regen : 'none'}`);
  lines.push(`- gold: ${s.gold ?? 0}`);
  lines.push(`- level: ${s.level ?? 1}`);
  lines.push(`- location: ${clean(s.location, 120) || 'unknown'}`);
  const attrs = (s.attributes ?? []).map((a) => `${clean(a.name, 40)} ${a.value}`).join(', ');
  lines.push(`- attributes: ${attrs || 'none yet'}`);
  lines.push(`- inventory: ${(s.inventory ?? []).map((x) => clean(x, 60)).join(', ') || 'empty'}`);
  if (r.kind !== 'start') {
    const traits = Array.isArray(s.traits) ? s.traits.filter((t) => clean(t?.name, 60)) : null;
    if (!traits) {
      lines.push('- powers and weaknesses gained in the story: not recorded yet (older adventure: add every power or weakness the story already gave the hero in addTraits now)');
    } else {
      const fmt = (t) => `${clean(t.name, 60)} (${t.kind === 'zwakte' ? 'weakness' : 'power'}${clean(t.detail, 160) ? `: ${clean(t.detail, 160)}` : ''})`;
      lines.push(`- powers and weaknesses gained in the story: ${traits.length ? traits.map(fmt).join('; ') : 'none'}`);
    }
  }
  const open = (s.quests ?? []).filter((q) => !q.done);
  lines.push(`- open quests: ${open.length ? open.map((q) => `"${clean(q.title, 80)}" (${clean(q.detail, 120)})`).join('; ') : 'none'}`);
  lines.push('');
  lines.push(...pacingLines(r));
  lines.push('');
  if (r.kind !== 'start') {
    const cast = (r.cast ?? []).filter((c) => clean(c?.name, 60) && clean(c?.look));
    lines.push('## Cast (fixed looks of recurring characters; reuse word for word in pictures, keep the narration consistent)');
    if (cast.length) for (const c of cast) lines.push(`- ${clean(c.name, 60)}: ${clean(c.look, 400)}`);
    else lines.push('- nobody yet');
    lines.push('');
    const earlier = (r.earlierPictures ?? []).map((p) => clean(p, 600)).filter(Boolean);
    if (earlier.length) {
      lines.push('## Earlier pictures (oldest first; this adventure has no cast yet, build it now)');
      for (const p of earlier) lines.push(`- ${p}`);
      lines.push('');
    }
    lines.push('## Story so far');
    lines.push(clean(r.summary, 2000) || '(nothing yet)');
    lines.push('');
    const recent = r.recent ?? [];
    if (recent.length) {
      lines.push('## Recent turns (oldest first)');
      for (const t of recent) {
        if (clean(t.action)) lines.push(`Player: ${clean(t.action)}`);
        lines.push(`Narrator: ${clean(t.narration, 1500)}`);
        if (clean(t.picture)) lines.push(`Picture shown: ${clean(t.picture)}`);
        lines.push('');
      }
    }
    lines.push('## The player does now');
    lines.push(clean(r.action, 500) || '(waits and looks around)');
    lines.push('');
  }
  lines.push(`## Hidden d20 roll for this turn: ${Number.isInteger(r.roll) ? r.roll : 10}`);
  lines.push('Use it only if the action is risky. Never mention it.');
  return lines.join('\n');
}

const LIMIT_RE = /usage limit|limit reached|hit your (?:usage )?limit|you've reached your|rate[_ ]limit|out of (?:extra )?usage|weekly limit|session limit/i;
const AUTH_RE = /invalid (?:api key|bearer token|oauth token)|oauth token (?:has )?expired|authentication[_ ]error|please run \/login|not logged in|could not resolve authentication|401\b|token (?:is )?(?:invalid|expired|revoked)/i;

/** Maakt van de melding van Claude Code een leesbare resettijd, als die erin staat. */
export function parseReset(text, timeZone = 'Europe/Amsterdam') {
  if (!text) return null;
  const epoch = text.match(/\|(\d{10,13})\b/);
  if (epoch) {
    const n = Number(epoch[1]);
    const d = new Date(epoch[1].length === 13 ? n : n * 1000);
    return d.toLocaleString('nl-NL', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
  const resets = text.match(/resets?\s+(?:at\s+|on\s+)?([^\n·.|]{2,40})/i);
  if (resets) return resets[1].trim();
  const again = text.match(/try again (?:at|after|in)\s+([^\n.]{2,40})/i);
  if (again) return again[1].trim();
  return null;
}

/**
 * Bepaalt de uitkomst van een run.
 * out = geparste JSON-uitvoer van `claude -p --output-format json` (of null),
 * raw = ruwe stdout+stderr, code = exitcode.
 */
export function classify(out, raw, code) {
  const text = [out && typeof out.result === 'string' ? out.result : '', raw || ''].join('\n');
  const failed = code !== 0 || !out || out.is_error === true || (out.subtype && out.subtype !== 'success');
  if (!failed && out && isAnswer(out.structured_output)) {
    return { status: 'ok', message: 'Klaar', resetAt: null, answer: out.structured_output };
  }
  if (!failed && out && typeof out.result === 'string') {
    const answer = extractJson(out.result);
    if (answer) return { status: 'ok', message: 'Klaar', resetAt: null, answer };
  }
  if (LIMIT_RE.test(text)) {
    return { status: 'limiet', message: 'Je Claude-limiet is op.', resetAt: parseReset(text), answer: null };
  }
  if (AUTH_RE.test(text)) {
    return {
      status: 'token',
      message: 'Het Claude-token werkt niet (verlopen of ongeldig). Maak een nieuw token met scripts/claude-token.sh.',
      resetAt: null,
      answer: null,
    };
  }
  const short = (out && typeof out.result === 'string' && out.result) || (raw || '').trim().split('\n').slice(-3).join(' ');
  return { status: 'fout', message: `De verteller gaf geen bruikbaar antwoord: ${String(short).slice(0, 300)}`, resetAt: null, answer: null };
}

function isAnswer(o) {
  return !!o && typeof o === 'object' && typeof o.narration === 'string' && o.narration.trim().length > 0;
}

/** Haalt het eerste JSON-object uit een tekst (fallback als er geen structured_output is). */
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(body.slice(start, end + 1));
    return isAnswer(obj) ? obj : null;
  } catch {
    return null;
  }
}

/** Laatste regel van stdout die geldige JSON is (claude -p --output-format json schrijft één object). */
export function parseCliOutput(stdout) {
  const t = (stdout || '').trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    for (const l of t.split('\n').reverse()) {
      try {
        const o = JSON.parse(l);
        if (o && typeof o === 'object') return o;
      } catch {
        /* volgende */
      }
    }
    return null;
  }
}

/**
 * Welke verzoeken moet de warme verteller nog doen? Die zonder antwoord, niet ouder dan maxAgeMs,
 * oudste eerst. requests = [{ id, createdAt }], responded = Set van ids.
 */
export function pendingIds(requests, responded, now, maxAgeMs = 15 * 60 * 1000) {
  return requests
    .filter((r) => validId(r.id) && r.id !== 'standby' && !responded.has(r.id))
    .filter((r) => {
      const t = Date.parse(r.createdAt);
      return Number.isFinite(t) && now - t <= maxAgeMs;
    })
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((r) => r.id);
}
