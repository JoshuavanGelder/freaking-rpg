// Is Claude beschikbaar? Twee bronnen: de uitkomst van de laatste beurt (limiet, token)
// en de openbare statuspagina van Anthropic.
import { DEFAULT_LANG, t, type Lang } from '../i18n.ts';
import type { TurnResponse } from './types.ts';

export type ClaudeHealth = {
  level: 'ok' | 'let op' | 'storing' | 'onbekend';
  text: string;
};

type StatusSummary = {
  status?: { indicator?: string; description?: string };
  components?: { name?: string; status?: string }[];
  incidents?: { name?: string; status?: string; impact?: string }[];
};

const RELEVANT = /claude code|claude\.ai|claude api|api/i;

/** Leest https://status.claude.com/api/v2/summary.json. */
export function summarizeStatus(json: unknown, lang: Lang = DEFAULT_LANG): ClaudeHealth {
  if (!json || typeof json !== 'object') return { level: 'onbekend', text: t(lang, 'status.unknown') };
  const s = json as StatusSummary;
  const bad = (s.components ?? []).filter((c) => c.name && RELEVANT.test(c.name) && c.status && c.status !== 'operational');
  const incidents = (s.incidents ?? []).filter((i) => i.status !== 'resolved' && i.status !== 'postmortem');
  if (bad.some((c) => c.status === 'major_outage' || c.status === 'partial_outage')) {
    return { level: 'storing', text: t(lang, 'status.outage', { what: bad.map((c) => c.name).join(', ') }) };
  }
  if (bad.length || incidents.length) {
    const what = incidents[0]?.name ?? bad.map((c) => c.name).join(', ');
    return { level: 'let op', text: t(lang, 'status.degraded', { what }) };
  }
  return { level: 'ok', text: t(lang, 'status.ok') };
}

/** Tekst voor de balk bovenin, op basis van de laatste run. */
export function responseHealth(r: TurnResponse | null, now: number, lang: Lang = DEFAULT_LANG): ClaudeHealth | null {
  if (!r) return null;
  const age = now - Date.parse(r.finishedAt);
  if (r.status === 'limiet' && age < 12 * 3600 * 1000) {
    return { level: 'storing', text: r.resetAt ? t(lang, 'status.limitWithReset', { when: r.resetAt }) : t(lang, 'status.limit') };
  }
  if (r.status === 'token') return { level: 'storing', text: t(lang, 'status.tokenDead') };
  return null;
}
