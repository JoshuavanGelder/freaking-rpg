// Pure hulpfuncties voor de verteller-workflow (getest met node --test rpg/lib.test.mjs).

export const MODELS = ['sonnet', 'opus', 'haiku'];

/** Alleen veilige ids: letters, cijfers en streepjes. */
export function validId(id) {
  return typeof id === 'string' && /^[a-z0-9-]{4,48}$/i.test(id);
}

/** Taal van het verzoek: alles wat geen 'en' is blijft Nederlands (oude verzoeken hebben geen taal). */
export const langOf = (r) => (r?.lang === 'en' ? 'en' : 'nl');

/** Meldingen van de verteller-workflow in de taal van het verzoek. */
const MSG = {
  nl: {
    ok: 'Klaar',
    limit: 'Je Claude-limiet is op.',
    token: 'Het Claude-token werkt niet (verlopen of ongeldig). Maak een nieuw token met scripts/claude-token.sh.',
    unusable: (short) => `De verteller gaf geen bruikbaar antwoord: ${short}`,
    notFound: 'Verzoek niet gevonden in de rpg-data-branch.',
    noToken: 'Er is nog geen Claude-token: zet het secret CLAUDE_CODE_OAUTH_TOKEN in de repo (maak het met scripts/claude-token.sh).',
    badJson: 'Het verzoek is geen geldige JSON.',
    cannotStart: (why) => `Claude Code kon niet starten: ${why}`,
  },
  en: {
    ok: 'Done',
    limit: 'Your Claude limit is used up.',
    token: 'The Claude token does not work (expired or invalid). Create a new token with scripts/claude-token.sh.',
    unusable: (short) => `The narrator gave no usable answer: ${short}`,
    notFound: 'Request not found in the rpg-data branch.',
    noToken: 'There is no Claude token yet: set the secret CLAUDE_CODE_OAUTH_TOKEN in the repo (create it with scripts/claude-token.sh).',
    badJson: 'The request is not valid JSON.',
    cannotStart: (why) => `Claude Code could not start: ${why}`,
  },
};

/** Melding in de gegeven taal ('nl' of 'en'). */
export const msg = (lang, key, arg) => {
  const m = (MSG[lang] ?? MSG.nl)[key];
  return typeof m === 'function' ? m(arg) : m;
};

const clean = (v, max = 600) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Lengte van de verteltekst per beurt, zoals de speler hem kiest. */
const NARRATION = {
  kort: 'at most 70 words, one or two short paragraphs (the ceiling for big moments). Brief and punchy: what happens and what the player decides, nothing more',
  normaal: 'at most 120 words (the ceiling for big moments)',
  uitgebreid: 'at most 200 words (the ceiling for big moments), room for atmosphere and detail when the moment deserves it',
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
  // De speler kan het einde ook tijdens het spelen kiezen ("nog 10 beurten"): dan telt de voortgang vanaf dat moment.
  const from = Number.isInteger(r.pacing?.from) && r.pacing.from > 0 ? Math.min(r.pacing.from, total - 1) : 0;
  const progress = (turn - from) / Math.max(1, total - from);
  lines.push(`- this is turn ${turn} of about ${total}.`);
  if (from > 0) lines.push(`- the player decided at turn ${from} that the story should end at turn ${total}. Shape a final arc from where the story stands now: use what is already in play (open quests, enemies, allies) rather than starting over.`);
  if (left <= 0) lines.push('- THE END IS DUE: this turn must be the ending. Resolve the main thread, close the open quests, write a satisfying final scene in the tone and set gameOver to true. No new cliffhanger, no choices needed.');
  else if (left === 1) lines.push('- ONE turn left after this one: this turn is the final confrontation or decision. The next turn is the ending.');
  else if (left <= 3) lines.push(`- ${left} turns left after this one: you are in the climax. Wrap up open threads and head for the final confrontation; no new big threads.`);
  else if (progress >= 0.6) lines.push(`- ${left} turns left: the story is in its last third. Escalate toward the climax and stop introducing new big threads.`);
  return lines;
}

/** Eén personage voor de verteller: wie het is, of die leeft, waar die woont. Doden krijgen geen uiterlijk (kost tokens en hoeft niet). */
function castLine(c) {
  const dead = c.status === 'dood';
  const parts = [];
  if (dead) parts.push('DEAD, stays dead');
  else if (c.status === 'vermist') parts.push('status: missing');
  else parts.push('status: alive');
  if (clean(c.role, 80)) parts.push(`role: ${clean(c.role, 80)}`);
  if (clean(c.home, 80)) parts.push(`home: ${clean(c.home, 80)}`);
  if (clean(c.note, 160)) parts.push(`note: ${clean(c.note, 160)}`);
  if (c.companion && !dead) parts.push('travels with the hero');
  const look = dead ? '' : clean(c.look, 400) || '(look not described yet: give one when they appear in a picture)';
  return `- ${clean(c.name, 60)}: ${look ? `${look} | ` : ''}${parts.join(' | ')}`;
}

/** De taal waarin de speler dit avontuur leest. Bij een wissel midden in een verhaal blijft het oude gewoon staan. */
export function languageLines(r) {
  const name = langOf(r) === 'en' ? 'English' : 'Dutch';
  return [
    '## Language',
    `- story language: ${name}`,
    `- write everything the player reads in ${name}: narration, the 3 choices, title, item, quest and trait names and texts, location, summary, cast roles, homes and notes, canon places, facts and time, and the names of new attributes. Picture prompts (image, heroLook, portrait, cast looks) stay English.`,
    `- earlier text may be in the other language (summary, quests, names, canon): keep it as it is, copy names exactly as written when you refer to them (completeQuests, removeTraits, forgetFacts, cast names), but write everything new in ${name}. You may restate the summary in ${name}.`,
  ];
}

/** Maakt van het verzoek (JSON van de app) een leesbaar bericht voor Claude. */
export function renderRequest(r) {
  const w = r.world ?? {};
  const h = r.hero ?? {};
  const s = r.state ?? {};
  const lines = [];
  lines.push(`# Turn type: ${r.kind === 'start' ? 'start (new adventure)' : 'turn'}`);
  lines.push('');
  lines.push(...languageLines(r));
  lines.push('');
  lines.push('## World');
  lines.push(`- setting: ${clean(w.setting) || 'free choice'}`);
  if (clean(w.settingText)) lines.push(`- the player's own world description: ${clean(w.settingText)}`);
  lines.push(`- tone(s): ${(w.tones ?? []).map((t) => clean(t, 60)).filter(Boolean).join(' + ') || 'free choice'}`);
  if (clean(w.toneText)) lines.push(`- the player's own tone description: ${clean(w.toneText)}`);
  if (clean(w.wishes)) lines.push(`- the player's wishes: ${clean(w.wishes)}`);
  lines.push(`- narration length per turn: ${NARRATION[w.textLength] ?? NARRATION.normaal}`);
  lines.push('- that is a ceiling, not a target: small actions (eating, resting, looking around, a short exchange) get one to three short sentences (see "Size the text to the moment")');
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
  if (r.resumed) {
    lines.push('## The story had ended and the player chose to continue');
    lines.push(`- The last turn below was the ending${r.resumed.died ? ', and the hero fell' : ''}. The player does not want the story to stop there. Continue it now (see "Continuing after an ending").`);
    if (r.resumed.died) lines.push('- The hero is alive again in the state (hit points are what they have now). Explain in the story how they got back.');
    lines.push('');
  }
  if (r.kind !== 'start') {
    const cast = (r.cast ?? []).filter((c) => clean(c?.name, 60));
    lines.push('## Cast (recurring characters: fixed look, status, home. Reuse looks word for word in pictures, keep the narration consistent)');
    if (cast.length) for (const c of cast) lines.push(castLine(c));
    else lines.push('- nobody yet');
    lines.push('');
    if (r.canon) {
      const places = (r.canon.places ?? []).filter((p) => clean(p?.name, 60));
      lines.push('## Places (fixed facts about recurring places: keep every description consistent)');
      if (places.length) for (const p of places) lines.push(`- ${clean(p.name, 60)}: ${clean(p.detail, 200)}`);
      else lines.push('- none yet');
      lines.push('');
      const facts = (r.canon.facts ?? []).map((f) => clean(f, 200)).filter(Boolean);
      lines.push('## Lasting facts (promises, debts, secrets, enemies, deals: do not forget or contradict)');
      if (facts.length) for (const f of facts) lines.push(`- ${f}`);
      else lines.push('- none yet');
      lines.push('');
      lines.push('## Time');
      lines.push(`- ${clean(r.canon.time, 80) || 'not set yet'}`);
      lines.push('');
    } else {
      lines.push('## Canon not recorded yet (older adventure: build it now)');
      lines.push('- Fill `cast` with every recurring character from the summary and recent turns (also those who died, with status "dood" and how), their homes and roles, `canon.places` with the places that matter (homes, bases), `canon.facts` with lasting promises, debts and enemies, and `canon.time`. First description wins.');
      lines.push('');
    }
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
export function parseReset(text, timeZone = 'Europe/Amsterdam', lang = 'nl') {
  if (!text) return null;
  const epoch = text.match(/\|(\d{10,13})\b/);
  if (epoch) {
    const n = Number(epoch[1]);
    const d = new Date(epoch[1].length === 13 ? n : n * 1000);
    return d.toLocaleString(lang === 'en' ? 'en-GB' : 'nl-NL', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit' });
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
export function classify(out, raw, code, lang = 'nl') {
  const text = [out && typeof out.result === 'string' ? out.result : '', raw || ''].join('\n');
  const failed = code !== 0 || !out || out.is_error === true || (out.subtype && out.subtype !== 'success');
  if (!failed && out && isAnswer(out.structured_output)) {
    return { status: 'ok', message: msg(lang, 'ok'), resetAt: null, answer: out.structured_output };
  }
  if (!failed && out && typeof out.result === 'string') {
    const answer = extractJson(out.result);
    if (answer) return { status: 'ok', message: msg(lang, 'ok'), resetAt: null, answer };
  }
  if (LIMIT_RE.test(text)) {
    return { status: 'limiet', message: msg(lang, 'limit'), resetAt: parseReset(text, undefined, lang), answer: null };
  }
  if (AUTH_RE.test(text)) {
    return {
      status: 'token',
      message: msg(lang, 'token'),
      resetAt: null,
      answer: null,
    };
  }
  const short = (out && typeof out.result === 'string' && out.result) || (raw || '').trim().split('\n').slice(-3).join(' ');
  return { status: 'fout', message: msg(lang, 'unusable', String(short).slice(0, 300)), resetAt: null, answer: null };
}

function isAnswer(o) {
  return !!o && typeof o === 'object' && typeof o.narration === 'string' && o.narration.trim().length > 0;
}

/** Verbruik van één beurt uit de JSON-uitvoer van `claude -p` (tokens; de kosten zijn een schatting tegen API-prijzen). */
export function pickUsage(out) {
  if (!out || typeof out !== 'object') return null;
  const u = out.usage && typeof out.usage === 'object' ? out.usage : null;
  if (!u) return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
  const cost = Number(out.total_cost_usd);
  return {
    input: n(u.input_tokens),
    output: n(u.output_tokens),
    cacheRead: n(u.cache_read_input_tokens),
    cacheWrite: n(u.cache_creation_input_tokens),
    costUsd: Number.isFinite(cost) ? Math.round(cost * 10000) / 10000 : null,
    apiMs: n(out.duration_api_ms),
    numTurns: n(out.num_turns),
  };
}

/** Hoe hard de verteller nadenkt: de opening maakt de wereld (medium), gewone beurten zijn kort (low). Haiku kent het niet. */
export function effortFor(model, kind) {
  if (model === 'haiku') return null;
  return kind === 'start' ? 'medium' : 'low';
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
