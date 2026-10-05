// Alle app-gegevens op één plek, bewaard in AsyncStorage. Het GitHub-token staat apart in SecureStore.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Adventure, TurnResponse } from './logic/types';
import { DEFAULT_IMAGE_LIMIT, type ImageCounter } from './logic/game';
import type { UsageEntry } from './logic/usage';
import { loadDrafts } from './drafts';
import { DEFAULT_LANG, langOf, setCurrentLang, type Lang } from './i18n';

export type Model = 'sonnet' | 'haiku' | 'opus';

export type Settings = {
  lang: Lang; // taal van de app en van de verteller
  owner: string;
  repo: string;
  model: Model;
  warm: boolean; // warme verteller starten als je de app opent
  images: boolean; // beelden maken
  imageLimit: number; // max. beelden per dag (gratis tegoed)
  imageUrlSet: boolean; // staat de koppelings-URL in SecureStore?
};

export type AppState = {
  version: 1;
  adventures: Adventure[];
  settings: Settings;
  lastResponse: TurnResponse | null;
  imageCounter: ImageCounter | null;
  /** Verbruik van de laatste beurten (tokens, nadenkstand), voor het overzicht bij Instellingen. Ontbreekt in oude opslag. */
  usageLog?: UsageEntry[];
};

export const DEFAULT_SETTINGS: Settings = {
  lang: DEFAULT_LANG,
  owner: 'JoshuavanGelder',
  repo: 'freaking-rpg',
  model: 'sonnet',
  warm: true,
  images: true,
  imageLimit: DEFAULT_IMAGE_LIMIT,
  imageUrlSet: false,
};

const EMPTY: AppState = { version: 1, adventures: [], settings: DEFAULT_SETTINGS, lastResponse: null, imageCounter: null };
const KEY = 'frpg-state-v1';

type Ctx = {
  state: AppState;
  loaded: boolean;
  /** Huidige staat, ook buiten React-renders (voor lopende beurten). */
  current: () => AppState;
  update: (fn: (s: AppState) => AppState) => void;
  saveAdventure: (adv: Adventure) => void;
  patchAdventure: (id: string, fn: (a: Adventure) => Adventure) => void;
  removeAdventure: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp buiten AppProvider');
  return c;
}

export function useAdventure(id: string): Adventure | null {
  const { state } = useApp();
  return state.adventures.find((a) => a.id === id) ?? null;
}

function sorted(list: Adventure[]): Adventure[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<AppState>(EMPTY);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY), loadDrafts()])
      .then(([raw]) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const next: AppState = {
          ...EMPTY,
          ...parsed,
          adventures: Array.isArray(parsed.adventures) ? parsed.adventures : [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        };
        next.settings.lang = langOf(next.settings.lang);
        setCurrentLang(next.settings.lang);
        ref.current = next;
        setState(next);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(ref.current);
    if (next.settings.lang !== ref.current.settings.lang) setCurrentLang(next.settings.lang);
    ref.current = next;
    setState(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      loaded,
      current: () => ref.current,
      update,
      saveAdventure: (adv) =>
        update((s) => ({ ...s, adventures: sorted([adv, ...s.adventures.filter((a) => a.id !== adv.id)]) })),
      patchAdventure: (id, fn) =>
        update((s) => ({ ...s, adventures: sorted(s.adventures.map((a) => (a.id === id ? fn(a) : a))) })),
      removeAdventure: (id) => update((s) => ({ ...s, adventures: s.adventures.filter((a) => a.id !== id) })),
      setSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    }),
    [state, loaded, update],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
