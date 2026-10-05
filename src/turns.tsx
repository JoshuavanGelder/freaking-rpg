// Lopende beurten: verzoek naar GitHub, wachten op de verteller, antwoord toepassen.
// Staat boven de schermen, zodat een beurt doorloopt als je van scherm wisselt of de app even sluit.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { useApp } from './store';
import * as gh from './services/github';
import { fetchClaudeStatus } from './services/status';
import { responseHealth, type ClaudeHealth } from './logic/status';
import { addUsage } from './logic/usage';
import { applyAnswer, buildRequest, makePending, newAdventure, parseAnswer, resumeAction, resumeStory, storyLang } from './logic/game';
import { tt } from './i18n';
import type { Adventure, Hero, Pending, TurnError, TurnErrorKind, TurnResponse, World } from './logic/types';

export type Phase = { stage: 'versturen' | 'opwarmen' | 'schrijven'; since: number };

type TurnCtx = {
  warm: gh.StandbyState;
  health: ClaudeHealth;
  phase: Record<string, Phase>;
  startAdventure: (world: World, hero: Hero) => string;
  act: (id: string, action: string) => void;
  resume: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
};

const Ctx = createContext<TurnCtx | null>(null);

export function useTurns(): TurnCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTurns buiten TurnProvider');
  return c;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_WAIT_S = 13 * 60;

class TurnFail extends Error {
  kind: TurnErrorKind;
  resetAt: string | null;
  url?: string;
  constructor(kind: TurnErrorKind, message: string, resetAt: string | null = null, url?: string) {
    super(message);
    this.kind = kind;
    this.resetAt = resetAt;
    this.url = url;
  }
}

export function TurnProvider({ children }: { children: React.ReactNode }) {
  const { state, loaded, current, update, saveAdventure, patchAdventure } = useApp();
  const [phase, setPhaseMap] = useState<Record<string, Phase>>({});
  const [warm, setWarm] = useState<gh.StandbyState>(null);
  const [statusPage, setStatusPage] = useState<ClaudeHealth>({ level: 'onbekend', text: tt('status.fetching') });
  const active = useRef(new Set<string>());

  const setPhase = useCallback((id: string, stage: Phase['stage'] | null) => {
    setPhaseMap((m) => {
      if (!stage) {
        const { [id]: _gone, ...rest } = m;
        return rest;
      }
      if (m[id]?.stage === stage) return m;
      return { ...m, [id]: { stage, since: Date.now() } };
    });
  }, []);

  const repoRef = (): gh.RepoRef => ({ owner: current().settings.owner, repo: current().settings.repo });
  const getAdv = (id: string): Adventure | null => current().adventures.find((a) => a.id === id) ?? null;
  const setPending = (id: string, p: Pending) => patchAdventure(id, (a) => (a.pending?.requestId === p.requestId ? { ...a, pending: p } : a));

  // ---------- warme verteller ----------
  // Zodra je de app opent staat er binnen een halve minuut een machine klaar,
  // zodat je beurt niet hoeft te wachten tot GitHub er een opstart.
  const warmBusy = useRef(false);
  const lastWarm = useRef(0);
  const checkWarm = useCallback(async (start: boolean) => {
    if (warmBusy.current) return;
    if (start && Date.now() - lastWarm.current < 30_000) return;
    warmBusy.current = true;
    try {
      if (!(await gh.getToken())) return;
      const repo = repoRef();
      let st = await gh.standbyState(repo);
      if (!st && start && current().settings.warm) {
        lastWarm.current = Date.now();
        await gh.ensureDataBranch(repo);
        await gh.startStandby(repo);
        st = 'opwarmen';
      }
      setWarm(st);
    } catch {
      setWarm(null);
    } finally {
      warmBusy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- één beurt afhandelen ----------
  const run = useCallback(async (id: string) => {
    if (active.current.has(id)) return;
    const first = getAdv(id);
    if (!first?.pending || first.error) return;
    active.current.add(id);
    let p: Pending = first.pending;
    try {
      if (!(await gh.getToken())) throw new TurnFail('setup', tt('err.setup.text'));
      const repo = repoRef();

      if (!p.posted) {
        setPhase(id, 'versturen');
        await gh.ensureDataBranch(repo);
        const adv = getAdv(id);
        if (!adv) return;
        try {
          await gh.putRequest(repo, p.requestId, buildRequest(adv, p, current().settings.model, undefined, current().settings.soundOn));
        } catch (e: any) {
          // 422: het verzoek stond er al (de app werd eerder onderbroken). Dat is goed.
          if (e?.status !== 422) throw e;
        }
        p = { ...p, posted: true };
        setPending(id, p);
      }

      let standby = await gh.standbyState(repo).catch(() => null);
      if (!standby && !p.dispatched) {
        await gh.dispatch(repo, p.requestId);
        p = { ...p, dispatched: true };
        setPending(id, p);
      }
      setPhase(id, standby === 'klaar' ? 'schrijven' : 'opwarmen');

      let response: TurnResponse | null = null;
      let runUrl: string | undefined;
      let lastCheck = Date.now();
      while (!response) {
        const now = getAdv(id);
        if (!now || now.pending?.requestId !== p.requestId) return; // weggegooid of vervangen
        response = await gh.getResponse(repo, p.requestId).catch(() => null);
        if (response) break;
        const secs = Math.round((Date.now() - p.startedAt) / 1000);
        if (secs > MAX_WAIT_S) throw new TurnFail('fout', tt('turn.timeout'), null, runUrl);
        if (!p.dispatched) {
          setPhase(id, standby === 'klaar' ? 'schrijven' : 'opwarmen');
          // Vangnet: de warme verteller is net gestopt of doet het niet; dan alsnog een losse run.
          if (Date.now() - lastCheck > 20_000) {
            lastCheck = Date.now();
            standby = await gh.standbyState(repo).catch(() => standby);
            setWarm(standby);
            if (!standby || secs > 75) {
              await gh.dispatch(repo, p.requestId);
              p = { ...p, dispatched: true };
              setPending(id, p);
            }
          }
        } else if (Date.now() - lastCheck > 8_000) {
          lastCheck = Date.now();
          const r = await gh.findRun(repo, p.requestId).catch(() => null);
          if (r) {
            runUrl = r.url;
            if (r.status === 'completed' && r.conclusion !== 'success') {
              // De workflow schrijft ook bij fouten een antwoord; kijk nog één keer.
              await sleep(3000);
              response = await gh.getResponse(repo, p.requestId).catch(() => null);
              if (!response) throw new TurnFail('fout', tt('turn.workflowFailed', { conclusion: String(r.conclusion) }), null, r.url);
              break;
            }
            setPhase(id, r.status === 'in_progress' ? 'schrijven' : 'opwarmen');
          }
        }
        await sleep(2000);
      }

      update((s) => ({ ...s, lastResponse: response, usageLog: addUsage(s.usageLog, response, p.kind) }));
      if (response.status !== 'ok') {
        throw new TurnFail(response.status, response.message || tt('turn.noAnswer'), response.resetAt, runUrl);
      }
      const answer = parseAnswer(response.answer);
      if (!answer) throw new TurnFail('fout', tt('turn.unreadable'), null, runUrl);
      const st = current().settings;
      const images = st.images && st.imageUrlSet;
      patchAdventure(id, (a) => (a.pending?.requestId === p.requestId ? applyAnswer(a, p, answer, Date.now(), images) : a));
    } catch (e: any) {
      const err: TurnError =
        e instanceof TurnFail
          ? { kind: e.kind, message: e.message, resetAt: e.resetAt, url: e.url }
          : { kind: 'fout', message: e?.message ? tt('turn.wentWrongWith', { msg: e.message }) : tt('turn.wentWrong') };
      patchAdventure(id, (a) => (a.pending?.requestId === p.requestId ? { ...a, error: err } : a));
    } finally {
      active.current.delete(id);
      setPhase(id, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // De statusmelding is tekst in de app-taal: opnieuw ophalen als die wisselt.
  const appLang = state.settings.lang;
  useEffect(() => {
    if (loaded) fetchClaudeStatus().then(setStatusPage);
  }, [loaded, appLang]);

  // Openstaande beurten weer oppakken (na opstarten of terugkomen in de app).
  const resumeAll = useCallback(() => {
    for (const a of current().adventures) if (a.pending && !a.error) run(a.id);
  }, [current, run]);

  useEffect(() => {
    if (!loaded) return;
    resumeAll();
    checkWarm(true);
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      resumeAll();
      checkWarm(true);
      fetchClaudeStatus().then(setStatusPage);
    });
    const timer = setInterval(() => {
      if (RNAppState.currentState === 'active') checkWarm(false);
    }, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [loaded, resumeAll, checkWarm]);

  const value = useMemo<TurnCtx>(
    () => ({
      warm,
      health: responseHealth(state.lastResponse, Date.now(), state.settings.lang) ?? statusPage,
      phase,
      startAdventure: (world, hero) => {
        const adv = newAdventure(world, hero);
        saveAdventure({ ...adv, pending: makePending('start', null) });
        setTimeout(() => run(adv.id), 0);
        return adv.id;
      },
      act: (id, action) => {
        const a = getAdv(id);
        const text = action.trim();
        if (!a || a.pending || a.ended || !text) return;
        patchAdventure(id, (x) => ({ ...x, pending: makePending('turn', text), error: null }));
        setTimeout(() => run(id), 0);
        checkWarm(true);
      },
      resume: (id) => {
        // Afgesloten verhaal toch voortzetten: meteen een beurt starten, zodat de keuzes er weer zijn.
        const a = getAdv(id);
        if (!a || !a.ended || a.pending) return;
        patchAdventure(id, (x) => ({ ...resumeStory(x), pending: makePending('turn', resumeAction(storyLang(a))), error: null }));
        setTimeout(() => run(id), 0);
        checkWarm(true);
      },
      retry: (id) => {
        const a = getAdv(id);
        if (!a?.pending) return;
        const old = a.pending;
        patchAdventure(id, (x) => ({ ...x, pending: makePending(old.kind, old.action), error: null }));
        setTimeout(() => run(id), 0);
      },
      dismiss: (id) => {
        // Mislukte beurt weggooien: je kunt opnieuw kiezen wat je doet.
        patchAdventure(id, (x) => (x.turns.length ? { ...x, pending: null, error: null } : x));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [warm, statusPage, phase, state.lastResponse, state.settings.lang, saveAdventure, patchAdventure, run, checkWarm],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
