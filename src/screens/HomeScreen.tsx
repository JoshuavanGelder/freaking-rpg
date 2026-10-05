import React from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { useApp } from '../store';
import { useT } from '../lang';
import { useTurns } from '../turns';
import { usePictures } from '../pictures';
import { useNav } from '../nav';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { IconButton, Label, Row, Screen, T } from '../ui';
import { ago, imagesUsed, picturesOf, turnCount, worldLabel } from '../logic/game';
import type { Adventure } from '../logic/types';

/** Laatste gelukte beeld van een avontuur (of het portret). */
function thumb(a: Adventure): string | null {
  const ok = picturesOf(a).filter((p) => p.status === 'ok' && p.uri);
  const scene = [...ok].reverse().find((p) => p.kind !== 'portrait');
  return (scene ?? ok[0])?.uri ?? null;
}

export function HomeScreen() {
  const { state } = useApp();
  const { removeWithPictures } = usePictures();
  const { warm, health, phase } = useTurns();
  const nav = useNav();
  const { t, tn, lang } = useT();

  const confirmDelete = (a: Adventure) =>
    Alert.alert(t('home.delete.title'), t('home.delete.text', { title: a.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeWithPictures(a) },
    ]);

  const used = imagesUsed(state.imageCounter);

  const narrator =
    warm === 'klaar'
      ? { dot: C.good, text: t('narrator.awake'), sub: t('narrator.awake.sub') }
      : warm === 'opwarmen'
        ? { dot: C.accent, text: t('narrator.waking'), sub: t('narrator.waking.sub') }
        : { dot: C.dim, text: t('narrator.asleep'), sub: t('narrator.asleep.sub') };

  return (
    <Screen gap={0}>
      <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <T weight="display" size={28} style={{ letterSpacing: -0.3 }}>
          <T weight="display" size={28} color={C.accent}>
            FREAKING
          </T>{' '}
          RPG
        </T>
        <IconButton icon="settings" label={t('home.settings')} onPress={() => nav.push({ name: 'settings' })} />
      </Row>
      <T size={15} color={C.muted} style={{ marginTop: 4 }}>
        {t('home.tagline')}
      </T>

      <Pressable
        accessibilityRole="button"
        onPress={() => nav.push({ name: 'new' })}
        style={({ pressed }) => ({
          marginTop: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          padding: 20,
          borderRadius: 18,
          backgroundColor: pressed ? C.accentPressed : C.accent,
        })}
      >
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.onAccent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={26} color={C.accent} strokeWidth={2.5} />
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <T weight="display" size={20} color={C.onAccent}>
            {t('home.new.title')}
          </T>
          <T size={14} weight="semibold" color={C.onAccent}>
            {t('home.new.sub')}
          </T>
        </View>
      </Pressable>

      {state.adventures.length ? (
        <View style={{ marginTop: 28, gap: 10 }}>
          <Label>{t('home.continue')}</Label>
          {state.adventures.map((a) => {
            const busy = !!a.pending && !a.error;
            const n = turnCount(a);
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityHint={t('home.longPress')}
                onPress={() => nav.push({ name: 'story', id: a.id })}
                onLongPress={() => confirmDelete(a)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: pressed ? C.cardHi : C.card,
                })}
              >
                <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {thumb(a) ? (
                    <Image source={{ uri: thumb(a)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Icon name={a.ended ? 'scroll' : 'book'} size={24} color={C.dim} strokeWidth={1.75} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T size={17} weight="bold" numberOfLines={1}>
                    {a.title}
                  </T>
                  <T size={13} color={C.muted} numberOfLines={1}>
                    {worldLabel(a.world, lang)}
                  </T>
                  <T size={13} color={busy ? C.accent : a.error ? C.hp : C.muted} numberOfLines={1}>
                    {busy
                      ? phase[a.id]?.stage === 'schrijven'
                        ? t('home.writing')
                        : t('home.sending')
                      : a.error
                        ? t('home.failed')
                        : a.ended
                          ? tn('home.ended', n)
                          : t('home.turn', { n, ago: ago(a.updatedAt, Date.now(), lang) })}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 28, padding: 18, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, gap: 6 }}>
          <T size={16} weight="bold">
            {t('home.empty.title')}
          </T>
          <T size={14} color={C.muted} style={{ lineHeight: 20 }}>
            {t('home.empty.text')}
          </T>
        </View>
      )}

      <View style={{ marginTop: 28, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, gap: 10 }}>
        <Row style={{ gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: narrator.dot }} />
          <T size={14} weight="semibold">
            {narrator.text}
          </T>
          <T size={14} color={C.muted} style={{ flex: 1 }} numberOfLines={1}>
            · {narrator.sub}
          </T>
        </Row>
        {state.settings.images && state.settings.imageUrlSet ? (
          <Row style={{ gap: 10 }}>
            <Icon name="image" size={16} color={C.muted} />
            <T size={14} weight="semibold">
              {t('home.imagesToday')}
            </T>
            <T size={14} color={C.muted} style={{ flex: 1 }} numberOfLines={1}>
              · {used.exhausted ? t('home.quotaUsed') : t('home.quotaCount', { count: used.count, limit: state.settings.imageLimit })}
            </T>
          </Row>
        ) : null}
        {health.level !== 'ok' && health.level !== 'onbekend' ? (
          <Row style={{ gap: 10, alignItems: 'flex-start' }}>
            <Icon name="alert" size={16} color={C.hp} />
            <T size={13} color={C.ink} style={{ flex: 1, fontFamily: F.regular }}>
              {health.text}
            </T>
          </Row>
        ) : null}
      </View>
    </Screen>
  );
}
