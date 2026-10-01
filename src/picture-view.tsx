import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { Icon } from './icons';
import { Row, T } from './ui';
import type { Picture } from './logic/types';

const LABEL: Record<Picture['kind'], string> = {
  portrait: 'Portret',
  scene: 'Scène',
  action: 'Actie',
  character: 'Personage',
};

/** Vierkant beeld in het verhaal: bezig, mislukt (met opnieuw) of klaar (tik = groot). */
export function PictureBox({ pic, onRetry, size }: { pic: Picture; onRetry?: () => void; size?: number }) {
  const [open, setOpen] = useState(false);
  const box: ViewStyle = { width: size ?? '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: C.cardHi };

  if (pic.status === 'pending') {
    return (
      <View style={[box, { alignItems: 'center', justifyContent: 'center', gap: 10 }]}>
        <ActivityIndicator color={C.accent} />
        <T size={13} color={C.muted}>
          {pic.kind === 'portrait' ? 'Portret wordt gemaakt…' : 'Beeld wordt gemaakt…'}
        </T>
      </View>
    );
  }

  if (pic.status === 'failed' || !pic.uri) {
    return (
      <View style={{ padding: 14, borderRadius: 14, backgroundColor: C.surface, gap: 8 }}>
        <Row style={{ gap: 10, alignItems: 'flex-start' }}>
          <Icon name="image" size={18} color={C.dim} />
          <T size={13} color={C.muted} style={{ flex: 1, lineHeight: 19 }}>
            Geen beeld: {pic.error ?? 'het lukte niet.'}
          </T>
        </Row>
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
            <T size={14} weight="semibold" color={C.accent}>
              Opnieuw proberen
            </T>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${LABEL[pic.kind]}, tik om groot te bekijken`} onPress={() => setOpen(true)} style={box}>
        <Image source={{ uri: pic.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {size ? null : (
          <View style={{ position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(21,18,15,0.85)' }}>
            <T size={12} weight="semibold">
              {LABEL[pic.kind]}
            </T>
          </View>
        )}
      </Pressable>
      <Viewer pic={open ? pic : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** Beeld op volledig scherm. */
export function Viewer({ pic, onClose }: { pic: Picture | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!pic} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,8,6,0.96)', justifyContent: 'center', padding: 16 }}>
        {pic?.uri ? <Image source={{ uri: pic.uri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} resizeMode="contain" /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sluiten"
          onPress={onClose}
          style={{ position: 'absolute', top: insets.top + 12, right: 16, width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={20} color={C.ink} />
        </Pressable>
      </View>
    </Modal>
  );
}
