import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdventure, useApp } from '../store';
import { useTurns, type Phase } from '../turns';
import { useT } from '../lang';
import { usePictures } from '../pictures';
import { PictureBox } from '../picture-view';
import { clearDraft, useDraft } from '../drafts';
import { RevealCtx, useKeyboardReveal } from '../keyboard';
import { useStorySound } from '../storysound';
import { sound } from '../services/sound';
import { useNav } from '../nav';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { Bar, Button, Chip, Field, IconButton, Row, T, TopBar } from '../ui';
import { MAX_TURNS_MORE, MIN_RESUME_TURNS, formatGold, paragraphs, setTurnsLeft, turnsLeft, worldLabel } from '../logic/game';
import type { Adventure, Turn } from '../logic/types';

export function StoryScreen({ id }: { id: string }) {
  const adv = useAdventure(id);
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardReveal(); // het eindkaartje heeft een tekstveld in de ScrollView
  const scroll = kb.ref;
  const [endOpen, setEndOpen] = useState(false);
  const endedRef = useRef(false);
  const { showScene } = usePictures();
  const { state } = useApp();
  const { t, lang } = useT();
  const imagesOn = state.settings.images && state.settings.imageUrlSet;
  useStorySound(adv); // geluid van de plek en van elke nieuwe beurt (hooks horen boven de vroege return)

  // Toetsenbord open: het invoerveld staat onderaan en schuift mee omhoog (KeyboardAvoidingView in App);
  // het verhaal scrolt naar het einde zodat de laatste tekst zichtbaar blijft. Op de eindkaart (met een tekstveld in
  // de ScrollView) doet useKeyboardReveal het scrollen, zodat het veld in beeld blijft.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (endedRef.current) return;
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    });
    return () => sub.remove();
  }, [scroll]);

  if (!adv) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 16 }}>
        <TopBar onBack={nav.back} />
        <T size={16}>{t('story.gone')}</T>
      </View>
    );
  }

  endedRef.current = adv.ended;
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
          subtitle={worldLabel(adv.world, lang)}
          right={
            <Row style={{ gap: 8 }}>
              {canShow ? <IconButton icon="image" label={t('story.showScene')} onPress={() => showScene(adv.id, last!.id)} /> : null}
              {adv.turns.length && !adv.ended ? <IconButton icon="scroll" label={t('story.end')} color={endOpen ? C.accent : C.ink} onPress={() => setEndOpen(!endOpen)} /> : null}
              <IconButton icon="user" label={t('story.hero')} onPress={() => nav.push({ name: 'sheet', id: adv.id })} />
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
                {formatGold(s.gold, lang)}
              </T>
            </Row>
            <T size={13} weight="bold" color={C.muted}>
              {t('story.level', { n: s.level })}
            </T>
          </Row>
        ) : null}
        {endOpen && adv.turns.length && !adv.ended ? <EndPlan adv={adv} onClose={() => setEndOpen(false)} /> : null}
      </View>

      <RevealCtx.Provider value={kb.reveal}>
        <ScrollView
          ref={scroll}
          onScroll={kb.onScroll}
          scrollEventThrottle={32}
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
          {adv.ended ? <EndCard adv={adv} /> : null}
        </ScrollView>
      </RevealCtx.Provider>

      {!adv.ended && !adv.error ? <ActionBar adv={adv} disabled={waiting} bottom={insets.bottom} /> : null}
    </View>
  );
}

function TurnView({ turn, onRetryImage }: { turn: Turn; onRetryImage: () => void }) {
  return (
    <View style={{ gap: 16 }}>
      {turn.action ? <Bubble text={turn.action} /> : null}
      {paragraphs(turn.narration).map((p, i) => (
        <T key={i} weight="story" size={17} selectable style={{ lineHeight: 27 }}>
          {p}
        </T>
      ))}
      {/* Beeld onder de tekst: je leest eerst wat er gebeurt, en het beeld is meestal pas daarna klaar. */}
      {turn.image ? <PictureBox pic={turn.image} onRetry={onRetryImage} /> : null}
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
  const { t } = useT();
  const stage: Phase['stage'] = phase[adv.id]?.stage ?? (adv.pending?.posted ? 'opwarmen' : 'versturen');
  const first = adv.turns.length === 0;
  return (
    <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 14 }}>
      <Row style={{ gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
        <T size={16} weight="bold">
          {first ? t('wait.first') : t('wait.next')}
        </T>
      </Row>
      <View style={{ gap: 10 }}>
        <Step state={stage === 'versturen' ? 'active' : 'done'} label={stage === 'versturen' ? t('wait.sending') : t('wait.sent')} />
        <Step
          state={stage === 'schrijven' ? 'done' : stage === 'opwarmen' ? 'active' : 'todo'}
          label={stage === 'schrijven' ? t('wait.awake') : t('wait.waking')}
        />
        <Step state={stage === 'schrijven' ? 'active' : 'todo'} label={first ? t('wait.writesOpening') : t('wait.writesNext')} />
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.cardHi }} />
        <View style={{ height: 10, width: '92%', borderRadius: 5, backgroundColor: C.cardHi }} />
        <View style={{ height: 10, width: '64%', borderRadius: 5, backgroundColor: C.cardHi }} />
      </View>
      <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
        {stage === 'opwarmen'
          ? t('wait.wakeNote')
          : t('wait.usualNote')}{' '}
        {t('wait.closeNote')}
      </T>
    </View>
  );
}

function ErrorCard({ adv }: { adv: Adventure }) {
  const { retry, dismiss } = useTurns();
  const nav = useNav();
  const { t } = useT();
  const e = adv.error!;
  const title = e.kind === 'limiet' ? t('err.limit.title') : e.kind === 'token' ? t('err.token.title') : e.kind === 'setup' ? t('err.setup.title') : t('err.other.title');
  // Bekende fouten staan in de taal van de app (niet in de taal waarin de melding ooit bewaard is).
  const text =
    e.kind === 'limiet'
      ? e.resetAt
        ? t('err.limit.reset', { when: e.resetAt })
        : t('err.limit.text')
      : e.kind === 'token'
        ? t('err.token.text')
        : e.kind === 'setup'
          ? t('err.setup.text')
          : e.message;
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
        <Button label={t('err.toSettings')} variant="outline" onPress={() => nav.push({ name: 'settings' })} />
      ) : null}
      <Button label={t('common.retry')} icon="refresh" onPress={() => retry(adv.id)} />
      {adv.turns.length ? <Button label={t('err.doSomethingElse')} variant="ghost" onPress={() => dismiss(adv.id)} /> : null}
    </View>
  );
}

type Preset = { key: string; label: string; value: number | null };

function endLabel(tr: ReturnType<typeof useT>, left: number | null): string {
  if (left === null) return tr.t('end.unlimited');
  if (left <= 0) return tr.t('end.next');
  return tr.tn('end.left', left);
}

const stepButton = (pressed: boolean) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1.5,
  borderColor: C.border,
  backgroundColor: pressed ? C.cardHi : C.bg,
});

/** Aantal beurten kiezen: keuzeknoppen plus min/plus. value null = onbeperkt. */
function TurnsPicker({ value, onChange, presets, min }: { value: number | null; onChange: (v: number | null) => void; presets: Preset[]; min: number }) {
  const { t, tn } = useT();
  const step = (d: number) => onChange(Math.min(MAX_TURNS_MORE, Math.max(min, (value ?? 10) + d)));
  return (
    <View style={{ gap: 12 }}>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {presets.map((p) => (
          <Chip key={p.key} label={p.label} selected={value === p.value} onPress={() => onChange(p.value)} />
        ))}
      </Row>
      {value !== null ? (
        <Row style={{ gap: 12, alignSelf: 'flex-start' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('end.less')} onPress={() => step(-1)} style={({ pressed }) => stepButton(pressed)}>
            <T size={22} weight="bold">
              −
            </T>
          </Pressable>
          <T size={16} weight="bold" style={{ minWidth: 96, textAlign: 'center' }}>
            {tn('end.turns', value)}
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel={t('end.more')} onPress={() => step(1)} style={({ pressed }) => stepButton(pressed)}>
            <Icon name="plus" size={20} color={C.ink} strokeWidth={2.5} />
          </Pressable>
        </Row>
      ) : null}
    </View>
  );
}

/**
 * Paneel om het einde van het verhaal te kiezen. Bewust niet in de standaardweergave: het aantal beurten
 * dat nog over is leidt af van het verhaal. Het paneel opent met het icoon rechtsboven.
 */
function EndPlan({ adv, onClose }: { adv: Adventure; onClose: () => void }) {
  const { patchAdventure } = useApp();
  const tr = useT();
  const { t } = tr;
  const left = turnsLeft(adv);
  const [n, setN] = useState<number | null>(left === null ? 10 : Math.min(MAX_TURNS_MORE, Math.max(1, left)));
  const presets: Preset[] = [
    { key: 'wrapUp', label: t('end.preset.wrapUp'), value: 1 },
    ...[3, 5, 10, 20].map((v) => ({ key: String(v), label: String(v), value: v })),
    { key: 'unlimited', label: t('end.preset.unlimited'), value: null },
  ];
  return (
    <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.card, gap: 12 }}>
      <T size={13} weight="semibold" color={C.muted}>
        {endLabel(tr, left)}
      </T>
      <T size={15} weight="bold">
        {t('end.question')}
      </T>
      <TurnsPicker value={n} onChange={setN} presets={presets} min={1} />
      <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
        {n === null ? t('end.help.unlimited') : n === 1 ? t('end.help.one') : t('end.help.many')}
      </T>
      <Button
        label={n === null ? t('end.button.unlimited') : n === 1 ? t('end.button.one') : t('end.button.many', { n })}
        onPress={() => {
          patchAdventure(adv.id, (a) => setTurnsLeft(a, n));
          onClose();
        }}
      />
    </View>
  );
}

function EndCard({ adv }: { adv: Adventure }) {
  const nav = useNav();
  const { resume } = useTurns();
  const { t } = useT();
  // Wat je hier invult blijft staan als je even naar je held kijkt (useDraft), en gaat weg zodra je doorgaat.
  const noteKey = `doorgaan-${adv.id}`;
  const turnsKey = `doorgaan-beurten-${adv.id}`;
  const [note, setNote] = useDraft<string>(noteKey, '');
  const [turns, setTurns] = useDraft<number | null>(turnsKey, null);
  const presets: Preset[] = [
    { key: 'unlimited', label: t('end.preset.unlimited'), value: null },
    ...[3, 5, 10, 20].map((v) => ({ key: String(v), label: String(v), value: v })),
  ];
  return (
    <View style={{ padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Icon name="scroll" size={28} color={C.accent} strokeWidth={1.75} />
        <T weight="display" size={22}>
          {t('endCard.title')}
        </T>
        <T size={14} color={C.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
          {t('endCard.text')}
        </T>
      </View>
      <Field label={t('endCard.wishLabel')} extra={t('endCard.optional')} value={note} onChangeText={setNote} placeholder={t('endCard.wishPlaceholder')} multiline />
      <View style={{ gap: 10 }}>
        <T size={13} weight="bold" color={C.accent} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('end.question')}
        </T>
        <TurnsPicker value={turns} onChange={setTurns} presets={presets} min={MIN_RESUME_TURNS} />
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {turns === null ? t('end.help.unlimited') : t('endCard.help.many')}
        </T>
      </View>
      <Button
        label={t('endCard.continue')}
        icon="arrow"
        onPress={() => {
          resume(adv.id, { note, turns });
          clearDraft(noteKey, turnsKey);
        }}
        style={{ alignSelf: 'stretch' }}
      />
      <Button label={t('endCard.new')} variant="outline" onPress={() => nav.replace({ name: 'new' })} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function ActionBar({ adv, disabled, bottom }: { adv: Adventure; disabled: boolean; bottom: number }) {
  const { act } = useTurns();
  const { t } = useT();
  // Wat je aan het typen was blijft staan als je even naar je held kijkt.
  const [text, setText] = useDraft<string>(`actie-${adv.id}`, '');
  const last = adv.turns[adv.turns.length - 1];
  const choices = !disabled && last ? last.choices : [];
  // Keuzes zijn eerst verstopt (eerst het verhaal lezen); bij elke nieuwe beurt weer dicht.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = !!last && openFor === last.id;
  const send = (t: string) => {
    if (disabled || !t.trim()) return;
    sound.tick();
    act(adv.id, t);
    setText('');
    setOpenFor(null);
  };
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 + bottom, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
      {choices.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? t('action.hide') : t('action.showA11y', { n: choices.length })}
          onPress={() => setOpenFor(open ? null : last!.id)}
          hitSlop={6}
          style={({ pressed }) => ({
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 36,
            paddingHorizontal: 14,
            borderRadius: 18,
            backgroundColor: pressed ? C.cardHi : 'transparent',
          })}
        >
          <T size={14} weight="semibold" color={C.muted}>
            {open ? t('action.hide') : t('action.choices', { n: choices.length })}
          </T>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={C.muted} strokeWidth={2.25} />
        </Pressable>
      ) : null}
      {(open ? choices : []).map((c) => (
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
      <Row style={{ gap: 8, marginTop: open && choices.length ? 4 : 0 }}>
        <TextInput
          accessibilityLabel={t('action.label')}
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={disabled ? t('action.placeholderWaiting') : t('action.placeholder')}
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
          accessibilityLabel={t('action.send')}
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
