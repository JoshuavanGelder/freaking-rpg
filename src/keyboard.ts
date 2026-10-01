// Toetsenbord: invoervelden moeten altijd zichtbaar blijven als het toetsenbord open is.
//
// Op nieuwere Android-versies (edge-to-edge, zoals de Galaxy S25) krimpt het venster niet meer mee
// met het toetsenbord. Daarom twee dingen, voor de hele app:
// 1. App.tsx zet alles in een KeyboardAvoidingView (padding = alleen het deel dat het toetsenbord
//    echt bedekt, dus ook goed als Android wél meekrimpt).
// 2. Elk scrollend scherm (Screen in ui.tsx) scrolt het actieve veld boven het toetsenbord,
//    zowel als het toetsenbord opent als wanneer je naar een ander veld tikt.
// Nieuw scherm met invoer? Gebruik Screen + Field, of useKeyboardReveal bij een eigen ScrollView.
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Keyboard, TextInput } from 'react-native';

const MARGIN = 24; // ruimte tussen het veld en het toetsenbord

export const RevealCtx = createContext<(() => void) | null>(null);

/** Voor invoervelden: roep aan bij focus, dan scrolt het scherm het veld in beeld. */
export function useReveal(): () => void {
  return useContext(RevealCtx) ?? (() => undefined);
}

/** Voor een ScrollView met invoervelden: ref, onScroll en reveal (die het actieve veld in beeld scrolt). */
export function useKeyboardReveal() {
  const ref = useRef<any>(null);
  const offset = useRef(0);

  const revealNow = useCallback((keyboardTop?: number) => {
    const top = keyboardTop ?? Keyboard.metrics()?.screenY;
    if (!top) return;
    const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (!input?.measureInWindow) return;
    input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      const bottom = y + h + MARGIN;
      if (bottom > top) ref.current?.scrollTo({ y: offset.current + (bottom - top), animated: true });
      else if (y < 80) ref.current?.scrollTo({ y: Math.max(0, offset.current - (80 - y)), animated: true });
    });
  }, []);

  // Wacht even tot de lay-out zich na het toetsenbord heeft aangepast.
  const reveal = useCallback(() => {
    setTimeout(() => revealNow(), 280);
  }, [revealNow]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const top = e?.endCoordinates?.screenY;
      setTimeout(() => revealNow(top), 80);
    });
    return () => sub.remove();
  }, [revealNow]);

  const onScroll = useCallback((e: any) => {
    offset.current = e?.nativeEvent?.contentOffset?.y ?? 0;
  }, []);

  return { ref, onScroll, reveal };
}
