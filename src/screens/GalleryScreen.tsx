import React, { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useAdventure } from '../store';
import { useNav } from '../nav';
import { useT } from '../lang';
import { C } from '../theme';
import { Screen, T, TopBar } from '../ui';
import { Viewer } from '../picture-view';
import { picturesOf } from '../logic/game';
import type { Picture } from '../logic/types';

/** Alle beelden van één avontuur, in volgorde van het verhaal. */
export function GalleryScreen({ id }: { id: string }) {
  const adv = useAdventure(id);
  const nav = useNav();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<Picture | null>(null);
  const pics = adv ? picturesOf(adv).filter((p) => p.status === 'ok' && p.uri) : [];
  const size = Math.floor((width - 40 - 10) / 2);

  return (
    <Screen gap={18}>
      <TopBar onBack={nav.back} title={t('gallery.title')} center />
      {adv ? (
        <T weight="display" size={24}>
          {adv.title}
        </T>
      ) : null}
      {pics.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {pics.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={t('gallery.openA11y')}
              onPress={() => setOpen(p)}
              style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', backgroundColor: C.cardHi }}
            >
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : (
        <T size={15} color={C.muted}>
          {t('gallery.empty')}
        </T>
      )}
      <Viewer pic={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
