import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAdventure, useApp } from '../store';
import { useNav } from '../nav';
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
  if (!adv) {
    return (
      <Screen>
        <TopBar onBack={nav.back} />
        <T size={16}>Dit avontuur bestaat niet meer.</T>
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
      <TopBar onBack={nav.back} title="Je held" center />
      <Row style={{ gap: 16 }}>
        {adv.portrait && adv.portrait.status !== 'failed' ? (
          <PictureBox pic={adv.portrait} size={112} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={adv.portrait ? 'Portret opnieuw proberen' : 'Nog geen portret'}
            onPress={adv.portrait ? () => retryPortrait(adv.id) : undefined}
            style={{ width: 112, height: 112, borderRadius: 16, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}
          >
            <Icon name={adv.portrait ? 'refresh' : 'user'} size={26} color={C.dim} strokeWidth={1.5} />
            {adv.portrait ? (
              <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
                Portret opnieuw
              </T>
            ) : null}
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <T weight="display" size={24} style={{ lineHeight: 28 }}>
            {h.name}
          </T>
          <T size={14} color={C.muted}>
            {h.className} · level {s.level}
          </T>
          <Row style={{ gap: 8, marginTop: 4 }}>
            <Bar value={xpInLevel} max={XP_PER_LEVEL} color={C.gold} height={6} />
          </Row>
          <T size={12} color={C.muted}>
            Op weg naar level {s.level + 1}
          </T>
        </View>
      </Row>

      <Row style={{ gap: 10 }}>
        <Card style={{ flex: 1, gap: 4, padding: 14 }}>
          <T size={12} weight="bold" color={C.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Leven
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
            Goud
          </T>
          <T weight="display" size={24} color={C.gold}>
            {formatGold(s.gold)}
          </T>
        </Card>
      </Row>

      {picturesOf(adv).some((p) => p.status === 'ok') ? (
        <Button
          label={`Galerij · ${picturesOf(adv).filter((p) => p.status === 'ok').length} beelden`}
          variant="outline"
          icon="grid"
          onPress={() => nav.push({ name: 'gallery', id: adv.id })}
        />
      ) : null}

      {h.powers || traits.length ? (
        <View style={{ gap: 10 }}>
          <Label>Krachten en zwaktes</Label>
          {h.powers ? (
            <T size={15} color={C.ink} style={{ lineHeight: 22 }}>
              {h.powers}
            </T>
          ) : null}
          {traits.length ? (
            <View style={{ borderRadius: 14, backgroundColor: C.card }}>
              {traits.map((t, i) => (
                <View key={t.name} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <Row style={{ gap: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: t.kind === 'zwakte' ? C.hpTint : C.accentTint,
                      }}
                    >
                      <T size={11} weight="bold" color={t.kind === 'zwakte' ? C.hp : C.accent} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {t.kind === 'zwakte' ? 'Zwakte' : 'Kracht'}
                      </T>
                    </View>
                    <T size={15} weight="semibold" style={{ flex: 1 }}>
                      {t.name}
                    </T>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t.kind === 'zwakte' ? 'Zwakte' : 'Kracht'} ${t.name} weghalen`}
                      hitSlop={10}
                      onPress={() =>
                        Alert.alert(`${t.name} weghalen?`, 'Haal dit alleen weg als je het verhaal deze kracht of zwakte heeft zien verliezen.', [
                          { text: 'Annuleer', style: 'cancel' },
                          { text: 'Weghalen', style: 'destructive', onPress: () => patchAdventure(adv.id, (a) => dropTraitByHand(a, t.name)) },
                        ])
                      }
                      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="close" size={16} color={C.muted} strokeWidth={2} />
                    </Pressable>
                  </Row>
                  {t.detail ? (
                    <T size={13} color={C.muted} style={{ lineHeight: 18 }}>
                      {t.detail}
                    </T>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Label right={<T size={13} color={C.muted}>{s.inventory.length === 1 ? '1 voorwerp' : `${s.inventory.length} voorwerpen`}</T>}>Tas</Label>
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
            Je tas is nog leeg.
          </T>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Label>Quests</Label>
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
                accessibilityLabel={`Quest ${q.title} afvinken`}
                hitSlop={10}
                onPress={() =>
                  Alert.alert(`${q.title} afvinken?`, 'Vink een quest alleen af als je hem in het verhaal hebt afgerond.', [
                    { text: 'Annuleer', style: 'cancel' },
                    { text: 'Afvinken', onPress: () => patchAdventure(adv.id, (a) => finishQuestByHand(a, q.title)) },
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
            Geen open quests.
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
        {worldLabel(adv.world)}
        {s.location ? ` · ${s.location}` : ''}
      </T>
    </Screen>
  );
}
