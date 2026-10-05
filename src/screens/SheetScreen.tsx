import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAdventure, useApp } from '../store';
import { useNav } from '../nav';
import { useT } from '../lang';
import { C } from '../theme';
import { Icon } from '../icons';
import { Bar, Button, Card, Label, Row, Screen, T, TopBar } from '../ui';
import { PictureBox } from '../picture-view';
import { usePictures } from '../pictures';
import { XP_PER_LEVEL, dropTraitByHand, finishQuestByHand, formatGold, picturesOf, worldLabel } from '../logic/game';

/** Je held: leven, goud, level, krachten, tas en quests. Verborgen eigenschappen blijven verborgen. */
export function SheetScreen({ id }: { id: string }) {
  const adv = useAdventure(id);
  const nav = useNav();
  const { retryPortrait } = usePictures();
  const { patchAdventure } = useApp();
  const { t, tn, lang } = useT();
  if (!adv) {
    return (
      <Screen>
        <TopBar onBack={nav.back} />
        <T size={16}>{t('story.gone')}</T>
      </Screen>
    );
  }
  const s = adv.state;
  const h = adv.hero;
  const open = s.quests.filter((q) => !q.done);
  const done = s.quests.filter((q) => q.done);
  const xpInLevel = s.xp % XP_PER_LEVEL;
  // Krachten eerst, dan zwaktes; elk in de volgorde waarin ze kwamen.
  const traits = [...(s.traits ?? [])].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'kracht' ? -1 : 1));

  return (
    <Screen gap={22}>
      <TopBar onBack={nav.back} title={t('sheet.title')} center />
      <Row style={{ gap: 16 }}>
        {adv.portrait && adv.portrait.status !== 'failed' ? (
          <PictureBox pic={adv.portrait} size={112} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={adv.portrait ? t('sheet.portraitRetryA11y') : t('sheet.noPortrait')}
            onPress={adv.portrait ? () => retryPortrait(adv.id) : undefined}
            style={{ width: 112, height: 112, borderRadius: 16, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}
          >
            <Icon name={adv.portrait ? 'refresh' : 'user'} size={26} color={C.dim} strokeWidth={1.5} />
            {adv.portrait ? (
              <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
                {t('sheet.portraitRetry')}
              </T>
            ) : null}
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <T weight="display" size={24} style={{ lineHeight: 28 }}>
            {h.name}
          </T>
          <T size={14} color={C.muted}>
            {t('sheet.levelLine', { class: h.className, n: s.level })}
          </T>
          <Row style={{ gap: 8, marginTop: 4 }}>
            <Bar value={xpInLevel} max={XP_PER_LEVEL} color={C.gold} height={6} />
          </Row>
          <T size={12} color={C.muted}>
            {t('sheet.toNextLevel', { n: s.level + 1 })}
          </T>
        </View>
      </Row>

      <Row style={{ gap: 10 }}>
        <Card style={{ flex: 1, gap: 4, padding: 14 }}>
          <T size={12} weight="bold" color={C.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {t('sheet.health')}
          </T>
          <T weight="display" size={24} color={C.hp}>
            {s.hp}
            <T size={15} color={C.muted}>
              {' '}
              / {s.maxHp}
            </T>
          </T>
        </Card>
        <Card style={{ flex: 1, gap: 4, padding: 14 }}>
          <T size={12} weight="bold" color={C.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {t('sheet.gold')}
          </T>
          <T weight="display" size={24} color={C.gold}>
            {formatGold(s.gold, lang)}
          </T>
        </Card>
      </Row>

      {picturesOf(adv).some((p) => p.status === 'ok') ? (
        <Button
          label={t('sheet.gallery', { n: picturesOf(adv).filter((p) => p.status === 'ok').length })}
          variant="outline"
          icon="grid"
          onPress={() => nav.push({ name: 'gallery', id: adv.id })}
        />
      ) : null}

      {h.powers || traits.length ? (
        <View style={{ gap: 10 }}>
          <Label>{t('sheet.powers')}</Label>
          {h.powers ? (
            <T size={15} color={C.ink} style={{ lineHeight: 22 }}>
              {h.powers}
            </T>
          ) : null}
          {traits.length ? (
            <View style={{ borderRadius: 14, backgroundColor: C.card }}>
              {traits.map((tr, i) => (
                <View key={tr.name} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <Row style={{ gap: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: tr.kind === 'zwakte' ? C.hpTint : C.accentTint,
                      }}
                    >
                      <T size={11} weight="bold" color={tr.kind === 'zwakte' ? C.hp : C.accent} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {tr.kind === 'zwakte' ? t('trait.zwakte') : t('trait.kracht')}
                      </T>
                    </View>
                    <T size={15} weight="semibold" style={{ flex: 1 }}>
                      {tr.name}
                    </T>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${tr.kind === 'zwakte' ? t('trait.zwakte') : t('trait.kracht')} ${tr.name} weghalen`}
                      hitSlop={10}
                      onPress={() =>
                        Alert.alert(t('sheet.removeTitle', { name: tr.name }), t('sheet.removeText'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('sheet.removeButton'), style: 'destructive', onPress: () => patchAdventure(adv.id, (a) => dropTraitByHand(a, tr.name)) },
                        ])
                      }
                      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="close" size={16} color={C.muted} strokeWidth={2} />
                    </Pressable>
                  </Row>
                  {tr.detail ? (
                    <T size={13} color={C.muted} style={{ lineHeight: 18 }}>
                      {tr.detail}
                    </T>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Label right={<T size={13} color={C.muted}>{tn('sheet.items', s.inventory.length)}</T>}>{t('sheet.bag')}</Label>
        {s.inventory.length ? (
          <View style={{ borderRadius: 14, backgroundColor: C.card }}>
            {s.inventory.map((it, i) => (
              <View
                key={`${it}-${i}`}
                style={{ minHeight: 52, paddingHorizontal: 16, justifyContent: 'center', borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}
              >
                <T size={15} weight="semibold">
                  {it}
                </T>
              </View>
            ))}
          </View>
        ) : (
          <T size={14} color={C.muted}>
            {t('sheet.bagEmpty')}
          </T>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('sheet.quests')}</Label>
        {open.length ? (
          open.map((q) => (
            <Row key={q.title} style={{ gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: C.card }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: C.gold }} />
              <View style={{ flex: 1, gap: 2 }}>
                <T size={15} weight="semibold">
                  {q.title}
                </T>
                {q.detail ? (
                  <T size={13} color={C.muted}>
                    {q.detail}
                  </T>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sheet.finishA11y', { title: q.title })}
                hitSlop={10}
                onPress={() =>
                  Alert.alert(t('sheet.finishTitle', { title: q.title }), t('sheet.finishText'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('sheet.finishButton'), onPress: () => patchAdventure(adv.id, (a) => finishQuestByHand(a, q.title)) },
                  ])
                }
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardHi }}
              >
                <Icon name="check" size={16} color={C.good} strokeWidth={2.5} />
              </Pressable>
            </Row>
          ))
        ) : (
          <T size={14} color={C.muted}>
            {t('sheet.noQuests')}
          </T>
        )}
        {done.map((q) => (
          <Row key={q.title} style={{ gap: 12, paddingHorizontal: 14 }}>
            <Icon name="check" size={16} color={C.good} strokeWidth={2.5} />
            <T size={14} color={C.muted} style={{ flex: 1, textDecorationLine: 'line-through' }}>
              {q.title}
            </T>
          </Row>
        ))}
      </View>

      <T size={13} color={C.dim}>
        {worldLabel(adv.world, lang)}
        {s.location ? ` · ${s.location}` : ''}
      </T>
    </Screen>
  );
}
