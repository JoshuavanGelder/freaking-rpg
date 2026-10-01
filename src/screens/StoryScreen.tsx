import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdventure, useApp } from '../store';
import { useTurns, type Phase } from '../turns';
import { usePictures } from '../pictures';
import { PictureBox } from '../picture-view';
import { useNav } from '../nav';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { Bar, Button, IconButton, Row, T, TopBar } from '../ui';
import { paragraphs, worldLabel } from '../logic/game';
import type { Adventure, Turn } from '../logic/types';

export function StoryScreen({ id }: { id: string }) {
  const adv = useAdventure(id);
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const scroll = useRef<any>(null);
  const { showScene } = usePictures();
  const { state } = useApp();
  const imagesOn = state.settings.images && state.settings.imageUrlSet;

  // Toetsenbord open: het invoerveld staat onderaan en schuift mee omhoog (KeyboardAvoidingView in App);
  // het verhaal scrolt naar het einde zodat de laatste tekst zichtbaar blijft.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80));
    return () => sub.remove();
  }, []);

  if (!adv) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 16 }}>
        <TopBar onBack={nav.back} />
        <T size={16}>Dit avontuur bestaat niet meer.</T>
      </View>
    );
  }

  const s = adv.state;
  const waiting = !!adv.pending && !adv.error;
  const last = adv.turns[adv.turns.length - 1];
  // "Toon scène" alleen als de laatste beurt nog geen (lopend of gelukt) beeld heeft.
  const canShow = imagesOn && !!last?.scene && !waiting && (!last.image || last.image.status === 'failed');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <TopBar
          onBack={nav.home}
          title={adv.title}
          subtitle={worldLabel(adv.world)}
          right={
            <Row style={{ gap: 8 }}>
              {canShow ? <IconButton icon="image" label="Toon scène als beeld" onPress={() => showScene(adv.id, last!.id)} /> : null}
              <IconButton icon="user" label="Je held" onPress={() => nav.push({ name: 'sheet', id: adv.id })} />
            </Row>
          }
        />
        {adv.turns.length ? (
          <Row style={{ gap: 14 }}>
            <Row style={{ flex: 1, gap: 8 }}>
              <Icon name="heart" size={16} color={C.hp} />
              <Bar value={s.hp} max={s.maxHp} color={C.hp} />
              <T size={13} weight="bold">
                {s.hp}/{s.maxHp}
              </T>
            </Row>
            <Row style={{ gap: 6 }}>
              <Icon name="coin" size={16} color={C.gold} />
              <T size={13} weight="bold">
                {s.gold}
              </T>
            </Row>
            <T size={13} weight="bold" color={C.muted}>
              Lv {s.level}
            </T>
          </Row>
        ) : null}
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {adv.turns.map((t) => (
          <TurnView key={t.id} turn={t} onRetryImage={() => showScene(adv.id, t.id)} />
        ))}
        {adv.pending ? <PendingAction text={adv.pending.action} /> : null}
        {waiting ? <Waiting adv={adv} /> : null}
        {adv.error ? <ErrorCard adv={adv} /> : null}
        {adv.ended ? <EndCard /> : null}
      </ScrollView>

      {!adv.ended && !adv.error ? <ActionBar adv={adv} disabled={waiting} bottom={insets.bottom} /> : null}
    </View>
  );
}

function TurnView({ turn, onRetryImage }: { turn: Turn; onRetryImage: () => void }) {
  return (
    <View style={{ gap: 16 }}>
      {turn.action ? <Bubble text={turn.action} /> : null}
      {turn.image ? <PictureBox pic={turn.image} onRetry={onRetryImage} /> : null}
      {paragraphs(turn.narration).map((p, i) => (
        <T key={i} weight="story" size={17} selectable style={{ lineHeight: 27 }}>
          {p}
        </T>
      ))}
      {turn.notes.length ? (
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {turn.notes.map((n) => (
            <View key={n} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.card }}>
              <T size={13} weight="semibold">
                {n}
              </T>
            </View>
          ))}
        </Row>
      ) : null}
    </View>
  );
}

function Bubble({ text }: { text: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-end',
        maxWidth: '84%',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        backgroundColor: C.accentTint,
        borderWidth: 1,
        borderColor: C.accentLine,
      }}
    >
      <T size={15} style={{ lineHeight: 21 }}>
        {text}
      </T>
    </View>
  );
}

function PendingAction({ text }: { text: string | null }) {
  return text ? <Bubble text={text} /> : null;
}

function Step({ state, label }: { state: 'done' | 'active' | 'todo'; label: string }) {
  return (
    <Row style={{ gap: 10 }}>
      {state === 'done' ? (
        <Icon name="check" size={18} color={C.good} strokeWidth={2.5} />
      ) : (
        <Icon name="pending" size={18} color={state === 'active' ? C.accent : C.dim} />
      )}
      <T size={14} weight={state === 'active' ? 'semibold' : 'regular'} color={state === 'todo' ? C.dim : C.ink}>
        {label}
      </T>
    </Row>
  );
}

function Waiting({ adv }: { adv: Adventure }) {
  const { phase } = useTurns();
  const stage: Phase['stage'] = phase[adv.id]?.stage ?? (adv.pending?.posted ? 'opwarmen' : 'versturen');
  const first = adv.turns.length === 0;
  return (
    <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 14 }}>
      <Row style={{ gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
        <T size={16} weight="bold">
          {first ? 'De verteller bedenkt je wereld…' : 'De verteller schrijft…'}
        </T>
      </Row>
      <View style={{ gap: 10 }}>
        <Step state={stage === 'versturen' ? 'active' : 'done'} label={stage === 'versturen' ? 'Beurt versturen' : 'Beurt verstuurd'} />
        <Step
          state={stage === 'schrijven' ? 'done' : stage === 'opwarmen' ? 'active' : 'todo'}
          label={stage === 'schrijven' ? 'Verteller is wakker' : 'Verteller wordt wakker'}
        />
        <Step state={stage === 'schrijven' ? 'active' : 'todo'} label={first ? 'Schrijft de openingsscène' : 'Schrijft het vervolg'} />
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.cardHi }} />
        <View style={{ height: 10, width: '92%', borderRadius: 5, backgroundColor: C.cardHi }} />
        <View style={{ height: 10, width: '64%', borderRadius: 5, backgroundColor: C.cardHi }} />
      </View>
      <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
        {stage === 'opwarmen'
          ? 'Wakker worden duurt 1 à 2 minuten; daarna gaat elke beurt in ongeveer 20 seconden.'
          : 'Meestal ongeveer 20 seconden.'}{' '}
        Je mag de app sluiten; het antwoord staat klaar als je terugkomt.
      </T>
    </View>
  );
}

function ErrorCard({ adv }: { adv: Adventure }) {
  const { retry, dismiss } = useTurns();
  const nav = useNav();
  const e = adv.error!;
  const title = e.kind === 'limiet' ? 'Je Claude-limiet is op' : e.kind === 'token' ? 'Claude-token werkt niet' : e.kind === 'setup' ? 'Nog niet ingesteld' : 'Dat ging mis';
  const text = e.kind === 'limiet' && e.resetAt ? `Weer beschikbaar: ${e.resetAt}. Je verhaal is bewaard; probeer het dan opnieuw.` : e.message;
  return (
    <View style={{ padding: 16, borderRadius: 16, backgroundColor: C.hpTint, gap: 12 }}>
      <Row style={{ gap: 10 }}>
        <Icon name="alert" size={18} color={C.hp} />
        <T size={16} weight="bold">
          {title}
        </T>
      </Row>
      <T size={14} style={{ lineHeight: 20 }}>
        {text}
      </T>
      {e.kind === 'setup' || e.kind === 'token' ? (
        <Button label="Naar instellingen" variant="outline" onPress={() => nav.push({ name: 'settings' })} />
      ) : null}
      <Button label="Opnieuw proberen" icon="refresh" onPress={() => retry(adv.id)} />
      {adv.turns.length ? <Button label="Iets anders doen" variant="ghost" onPress={() => dismiss(adv.id)} /> : null}
    </View>
  );
}

function EndCard() {
  const nav = useNav();
  return (
    <View style={{ padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, gap: 12, alignItems: 'center' }}>
      <Icon name="scroll" size={28} color={C.accent} strokeWidth={1.75} />
      <T weight="display" size={22}>
        Einde
      </T>
      <T size={14} color={C.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
        Dit verhaal is uit. Je kunt het teruglezen wanneer je wilt.
      </T>
      <Button label="Nieuw avontuur" icon="arrow" onPress={() => nav.replace({ name: 'new' })} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function ActionBar({ adv, disabled, bottom }: { adv: Adventure; disabled: boolean; bottom: number }) {
  const { act } = useTurns();
  const [text, setText] = useState('');
  const last = adv.turns[adv.turns.length - 1];
  const choices = !disabled && last ? last.choices : [];
  const send = (t: string) => {
    if (disabled || !t.trim()) return;
    act(adv.id, t);
    setText('');
  };
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + bottom, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
      {choices.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          onPress={() => send(c)}
          style={({ pressed }) => ({
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: C.border,
            backgroundColor: pressed ? C.cardHi : C.card,
            justifyContent: 'center',
          })}
        >
          <T size={15} weight="semibold" style={{ lineHeight: 20 }}>
            {c}
          </T>
        </Pressable>
      ))}
      <Row style={{ gap: 8, marginTop: choices.length ? 4 : 0 }}>
        <TextInput
          accessibilityLabel="Wat doe je?"
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={disabled ? 'Even wachten op de verteller…' : 'Of typ zelf wat je doet…'}
          placeholderTextColor={C.dim}
          onSubmitEditing={() => send(text)}
          returnKeyType="send"
          style={{
            flex: 1,
            height: 50,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: disabled ? C.line : C.border,
            backgroundColor: disabled ? C.surface : C.card,
            color: C.ink,
            fontFamily: F.regular,
            fontSize: 15,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verstuur"
          onPress={() => send(text)}
          style={({ pressed }) => ({
            width: 50,
            height: 50,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: disabled || !text.trim() ? C.cardHi : pressed ? C.accentPressed : C.accent,
          })}
        >
          <Icon name="arrow" size={20} color={disabled || !text.trim() ? C.dim : C.onAccent} strokeWidth={2.5} />
        </Pressable>
      </Row>
    </View>
  );
}
