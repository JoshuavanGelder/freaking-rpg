// Beelden maken met je eigen Cloudflare Worker (de Images-koppeling, FLUX.2 klein 4B).
// De app praat rechtstreeks met de Worker via dezelfde URL als de koppeling in Claude:
// https://<worker>.<subdomein>.workers.dev/mcp/<SECRET>. Die URL is het wachtwoord, dus hij staat in SecureStore.
import * as SecureStore from 'expo-secure-store';
import { IMAGE_SIZE } from '../logic/game';

const K_URL = 'frpg_image_url';

export type ImageErrorKind = 'filter' | 'tegoed' | 'setup' | 'fout';

export class ImageError extends Error {
  kind: ImageErrorKind;
  constructor(kind: ImageErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function getImageUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(K_URL);
}

export async function setImageUrl(url: string | null): Promise<void> {
  if (url) await SecureStore.setItemAsync(K_URL, url.trim());
  else await SecureStore.deleteItemAsync(K_URL);
}

/** Ziet de URL eruit als een koppelings-URL? null = goed, anders de reden. */
export function urlProblem(url: string): string | null {
  const u = url.trim();
  if (!/^https:\/\/[^/\s]+\/mcp\/[^/\s]+$/.test(u)) return 'Dat lijkt geen koppelings-URL. Die ziet eruit als https://…workers.dev/mcp/…';
  return null;
}

let nextId = 1;

async function rpc(url: string, method: string, params: unknown, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
      signal: ctrl.signal,
    });
    if (res.status === 404) throw new ImageError('setup', 'De beeld-URL klopt niet (niet gevonden). Kopieer hem opnieuw uit je Images-koppeling.');
    if (!res.ok) throw new ImageError('fout', `De beeldenserver gaf fout ${res.status}.`);
    const body = await res.json();
    if (body?.error) throw new ImageError('fout', `De beeldenserver weigerde: ${body.error.message ?? 'onbekende fout'}`);
    return body?.result;
  } catch (e: any) {
    if (e instanceof ImageError) throw e;
    if (e?.name === 'AbortError') throw new ImageError('fout', 'Het beeld duurde te lang.');
    throw new ImageError('fout', 'Geen verbinding met de beeldenserver.');
  } finally {
    clearTimeout(timer);
  }
}

/** Test de URL zonder iets van je tegoed te gebruiken (alleen de lijst met tools ophalen). */
export async function checkImageUrl(url: string): Promise<string | null> {
  const bad = urlProblem(url);
  if (bad) return bad;
  try {
    const r = await rpc(url.trim(), 'tools/list', {}, 15_000);
    const ok = Array.isArray(r?.tools) && r.tools.some((t: any) => t?.name === 'generate_image');
    return ok ? null : 'De server antwoordt, maar heeft geen beeldgenerator.';
  } catch (e: any) {
    return e?.message ?? 'Testen mislukt.';
  }
}

/** Maakt één vierkant beeld van 512x512 met het goedkoopste model. Geeft base64 + mime terug. */
export async function generate(url: string, prompt: string): Promise<{ data: string; mime: string }> {
  const r = await rpc(
    url,
    'tools/call',
    { name: 'generate_image', arguments: { prompt, model: 'klein', preset: 'square', width: IMAGE_SIZE, height: IMAGE_SIZE } },
    120_000,
  );
  const content: any[] = Array.isArray(r?.content) ? r.content : [];
  const text = content.filter((c) => c?.type === 'text').map((c) => String(c.text ?? '')).join(' ');
  if (r?.isError) {
    if (/3030|flagged/i.test(text)) throw new ImageError('filter', 'Het beeldfilter weigerde dit beeld.');
    if (/quota|limit|neuron|4006|capacity/i.test(text)) throw new ImageError('tegoed', 'Het gratis beeldtegoed van vandaag is op; na middernacht kun je weer beelden maken.');
    throw new ImageError('fout', text.slice(0, 200) || 'Het beeld kon niet gemaakt worden.');
  }
  const img = content.find((c) => c?.type === 'image' && typeof c.data === 'string');
  if (!img) throw new ImageError('fout', 'De beeldenserver stuurde geen beeld terug.');
  return { data: img.data, mime: typeof img.mimeType === 'string' ? img.mimeType : 'image/jpeg' };
}
