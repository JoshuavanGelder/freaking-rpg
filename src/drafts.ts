// Concepten: wat je half hebt ingevuld blijft staan als je tussen schermen wisselt (stap 1 ↔ stap 2,
// verhaal ↔ held) en zelfs als de app tussendoor wordt afgesloten. Los van de grote app-staat bewaard,
// zodat niet bij elke toetsaanslag alle avonturen opnieuw worden weggeschreven.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';

const KEY = 'frpg-drafts-v1';
let mem: Record<string, unknown> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

function save() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(mem)).catch(() => undefined);
  }, 400);
}

/** Eén keer bij het opstarten (AppProvider wacht hierop). */
export async function loadDrafts(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) mem = JSON.parse(raw) ?? {};
  } catch {
    mem = {};
  }
}

export function getDraft<T>(key: string, fallback: T): T {
  return key in mem ? (mem[key] as T) : fallback;
}

export function setDraft(key: string, value: unknown): void {
  mem = { ...mem, [key]: value };
  save();
}

export function clearDraft(...keys: string[]): void {
  const next = { ...mem };
  for (const k of keys) delete next[k];
  mem = next;
  save();
}

/** Als useState, maar de waarde blijft bewaard onder `key`. */
export function useDraft<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => getDraft(key, fallback));
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        setDraft(key, next);
        return next;
      });
    },
    [key],
  );
  return [value, set];
}
