// De beeldenwachtrij: maakt openstaande beelden één voor één (portret eerst), slaat ze op de telefoon op
// en houdt het dagtegoed bij. Loopt door als je van scherm wisselt en pakt na een herstart weer op.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { useApp } from './store';
import * as img from './services/images';
import { deletePictures, savePicture } from './services/files';
import { canMakeImage, findPicture, imagesUsed, picturesOf, requestPicture, requestPortrait, styledPrompt, updatePicture } from './logic/game';
import type { Adventure, Picture } from './logic/types';

type PicCtx = {
  /** "Toon scène": beeld van een beurt maken (of opnieuw proberen). */
  showScene: (advId: string, turnId: string) => void;
  retryPortrait: (advId: string) => void;
  /** Avontuur weggooien inclusief de beeldbestanden. */
  removeWithPictures: (adv: Adventure) => void;
};

const Ctx = createContext<PicCtx | null>(null);

export function usePictures(): PicCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePictures buiten PictureProvider');
  return c;
}

/** Wacht tot de app voorop staat: op de achtergrond verbreekt Android lopende verbindingen. */
function whenActive(): Promise<void> {
  if (RNAppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

function nextPending(adventures: Adventure[]): { advId: string; pic: Picture } | null {
  for (const a of adventures) {
    for (const p of picturesOf(a)) if (p.status === 'pending') return { advId: a.id, pic: p };
  }
  return null;
}

export function PictureProvider({ children }: { children: React.ReactNode }) {
  const { state, loaded, current, update, patchAdventure, removeAdventure } = useApp();
  const busy = useRef(false);

  const fail = (advId: string, id: string, error: string) =>
    patchAdventure(advId, (a) => updatePicture(a, id, { status: 'failed', error }));

  const work = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Eén voor één: de gratis Worker is snel genoeg, en zo blijft het tegoed overzichtelijk.
      for (;;) {
        const next = nextPending(current().adventures);
        if (!next) return;
        const { advId, pic } = next;
        const st = current().settings;
        if (!st.images) {
          fail(advId, pic.id, 'Beelden staan uit in Instellingen.');
          continue;
        }
        const url = await img.getImageUrl();
        if (!url) {
          fail(advId, pic.id, 'Stel eerst de beeld-URL in bij Instellingen.');
          continue;
        }
        if (!canMakeImage(current().imageCounter, st.imageLimit)) {
          fail(advId, pic.id, 'Het beeldtegoed van vandaag is op.');
          continue;
        }
        const adv = current().adventures.find((a) => a.id === advId);
        if (!adv) continue;
        let result: { data: string; mime: string } | null = null;
        let error = '';
        let attempts = 0;
        // Volgorde: de echte prompt; bij het filter de rustige versie (alleen de plek). Valt de verbinding weg
        // (app even op de achtergrond), dan dezelfde prompt nog twee keer, telkens als de app weer voorop staat.
        const prompts = [pic.prompt, pic.fallback].filter(Boolean);
        let p = 0;
        let netTries = 0;
        while (p < prompts.length && !result) {
          await whenActive();
          attempts++;
          try {
            result = await img.generate(url, styledPrompt(adv.world.setting, prompts[p]));
          } catch (e: any) {
            error = e?.message ?? 'Het beeld kon niet gemaakt worden.';
            if (e?.kind === 'tegoed') {
              update((s) => ({ ...s, imageCounter: { ...imagesUsed(s.imageCounter), exhausted: true } }));
              break;
            }
            if (e?.kind === 'netwerk' && netTries < 2) {
              netTries++;
              attempts--; // telt niet mee: er is niets gemaakt
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }
            if (e?.kind === 'filter') {
              p++;
              continue;
            }
            break;
          }
        }
        update((s) => {
          const c = imagesUsed(s.imageCounter);
          return { ...s, imageCounter: { ...c, count: c.count + attempts } };
        });
        // Is het beeld intussen weggegooid? Dan niets opslaan.
        const still = current().adventures.find((a) => a.id === advId);
        if (!still || findPicture(still, pic.id)?.status !== 'pending') continue;
        if (!result) {
          fail(advId, pic.id, error || 'Het beeld kon niet gemaakt worden.');
          continue;
        }
        try {
          const old = findPicture(still, pic.id)?.uri;
          const uri = savePicture(pic.id, result.data, result.mime);
          deletePictures([old]);
          patchAdventure(advId, (a) => updatePicture(a, pic.id, { status: 'ok', uri, error: undefined }));
        } catch (e: any) {
          fail(advId, pic.id, `Opslaan mislukt: ${e?.message ?? e}`);
        }
      }
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zodra er iets openstaat (nieuwe beurt, "Toon scène", herstart) de wachtrij laten lopen.
  const hasPending = state.adventures.some((a) => picturesOf(a).some((p) => p.status === 'pending'));
  useEffect(() => {
    if (loaded && hasPending) work();
  }, [loaded, hasPending, work]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') work();
    });
    return () => sub.remove();
  }, [work]);

  const value = useMemo<PicCtx>(
    () => ({
      showScene: (advId, turnId) => patchAdventure(advId, (a) => requestPicture(a, turnId)),
      retryPortrait: (advId) => patchAdventure(advId, (a) => requestPortrait(a)),
      removeWithPictures: (adv) => {
        deletePictures(picturesOf(adv).map((p) => p.uri));
        removeAdventure(adv.id);
      },
    }),
    [patchAdventure, removeAdventure],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
