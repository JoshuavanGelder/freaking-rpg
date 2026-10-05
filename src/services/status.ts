import { summarizeStatus, type ClaudeHealth } from '../logic/status';
import { tt, currentLang } from '../i18n';

/** Openbare statuspagina van Anthropic. */
export async function fetchClaudeStatus(): Promise<ClaudeHealth> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://status.claude.com/api/v2/summary.json', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { level: 'onbekend', text: tt('status.unreachable') };
    return summarizeStatus(await res.json(), currentLang());
  } catch {
    return { level: 'onbekend', text: tt('status.unreachable') };
  }
}
