// Koppelt het geluid aan het verhaalscherm: ambience en muziek van de plek, effecten bij een nieuwe beurt.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useApp, type Settings } from './store';
import { sound, type SoundLevels } from './services/sound';
import { currentAmbience, currentMood } from './logic/sound';
import type { Adventure } from './logic/types';

/** De geluidsinstellingen als niveaus voor de afspeelmotor. */
export function levelsOf(st: Settings): SoundLevels {
  return { on: st.soundOn, sfx: st.sfxVolume, ambience: st.ambienceVolume, music: st.musicVolume, vibrate: st.vibrate };
}

/** Houdt de afspeelmotor in lijn met de instellingen (ook buiten het verhaal, bv. bij Instellingen). */
export function useSoundSettings() {
  const { state } = useApp();
  const l = levelsOf(state.settings);
  useEffect(() => {
    sound.configure(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.on, l.sfx, l.ambience, l.music, l.vibrate]);
}

/**
 * Geluid van een open avontuur. Bij het openen start de ambience en muziek van de laatste plek (zonder effect);
 * een nieuwe beurt speelt zijn effecten; bij verlaten faden de loops uit. Een beurt die binnenkomt terwijl de app
 * niet voorop staat blijft stil.
 */
export function useStorySound(adv: Adventure | null) {
  useSoundSettings();
  const { state } = useApp();
  const l = levelsOf(state.settings);
  const ambience = adv ? currentAmbience(adv.turns) : null;
  const mood = adv ? currentMood(adv.turns) : null;

  useEffect(() => {
    sound.setScene(ambience, mood);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambience, mood, l.on, l.ambience > 0, l.music > 0]);

  useEffect(() => () => sound.leaveScene(), []);

  const lastTurn = adv && adv.turns.length ? adv.turns[adv.turns.length - 1] : null;
  const lastId = lastTurn ? lastTurn.id : null;
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seen.current === undefined) {
      seen.current = lastId; // de beurt die er al stond is oud nieuws
      return;
    }
    if (!lastTurn || lastId === seen.current) return;
    seen.current = lastId;
    if (AppState.currentState === 'active') sound.playTurn(lastTurn.sound, adv!.world.setting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);
}
