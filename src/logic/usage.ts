// Verbruik per beurt bijhouden en samenvatten, zodat je zelf ziet wat "low" of "medium" nadenken kost.
// Tokens komen van Claude Code zelf; de kosten zijn een schatting tegen API-prijzen (je betaalt via je abonnement).
import type { TurnResponse } from './types.ts';

export type UsageEntry = {
  at: number;
  kind: 'start' | 'turn';
  model: string;
  effort: string; // low, medium, of 'standaard' (haiku kent geen instelling)
  tokensIn: number; // alles wat Claude las (nieuw + uit het geheugen)
  tokensOut: number; // wat Claude schreef, inclusief nadenken
  costUsd: number | null;
  secs: number;
};

const MAX_LOG = 40;

/** Zet het verbruik van een geslaagde beurt achter in de lijst (laatste 40). Zonder verbruik blijft de lijst zoals hij was. */
export function addUsage(log: UsageEntry[] | undefined, r: TurnResponse | null | undefined, kind: 'start' | 'turn', now = Date.now()): UsageEntry[] {
  const list = log ?? [];
  if (!r || r.status !== 'ok' || !r.usage) return list;
  const u = r.usage;
  const entry: UsageEntry = {
    at: now,
    kind,
    model: r.model || '?',
    effort: r.effort || 'standaard',
    tokensIn: u.input + u.cacheRead + u.cacheWrite,
    tokensOut: u.output,
    costUsd: u.costUsd,
    secs: Math.round((r.durationMs ?? 0) / 1000),
  };
  return [...list, entry].slice(-MAX_LOG);
}

export type UsageGroup = { key: string; label: string; count: number; avgIn: number; avgOut: number; avgCost: number | null; avgSecs: number };

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Gemiddelden per soort beurt (opening of beurt), model en nadenkstand. Openingen eerst. */
export function summarizeUsage(log: UsageEntry[] | undefined): UsageGroup[] {
  const groups = new Map<string, UsageEntry[]>();
  for (const e of log ?? []) {
    const key = `${e.kind}|${e.model}|${e.effort}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([key, es]) => {
      const costs = es.map((e) => e.costUsd).filter((c): c is number => c !== null);
      return {
        key,
        label: `${es[0].kind === 'start' ? 'Opening' : 'Beurt'} · ${es[0].model} ${es[0].effort}`,
        count: es.length,
        avgIn: avg(es.map((e) => e.tokensIn)),
        avgOut: avg(es.map((e) => e.tokensOut)),
        avgCost: costs.length ? Math.round((costs.reduce((a, b) => a + b, 0) / costs.length) * 1000) / 1000 : null,
        avgSecs: avg(es.map((e) => e.secs)),
      };
    })
    .sort((a, b) => (a.key.startsWith('start') === b.key.startsWith('start') ? a.key.localeCompare(b.key) : a.key.startsWith('start') ? -1 : 1));
}

/** 9400 -> "9,4k", 850 -> "850". */
export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(n));
}
