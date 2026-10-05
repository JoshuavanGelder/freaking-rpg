import React, { useState } from 'react';
import { View } from 'react-native';
import { useNav } from '../nav';
import { useDraft } from '../drafts';
import { useApp } from '../store';
import { useT } from '../lang';
import { LANGS } from '../i18n';
import { C } from '../theme';
import { Icon } from '../icons';
import { Button, Chip, Field, Label, Row, Screen, T, Tile, TopBar } from '../ui';
import {
  ARCS,
  DEFAULT_ARC,
  DEFAULT_TEXT_LENGTH,
  OWN_TONE,
  TEXT_LENGTHS,
  TONES,
  arcHint,
  arcLabel,
  settingsList,
  textLengthHint,
  textLengthLabel,
  toggleTone,
  toneLabel,
  worldProblem,
} from '../logic/game';
import type { World } from '../logic/types';

/** Stap 1: wereld en toon kiezen. */
export function NewScreen() {
  const nav = useNav();
  const { state } = useApp();
  const { t, lang } = useT();
  // Blijft bewaard als je naar stap 2 gaat en terugkomt (of de app tussendoor sluit).
  const [world, setWorld] = useDraft<World>('new-world', {
    setting: 'fantasy',
    settingText: '',
    tones: ['Humoristisch'],
    toneText: '',
    wishes: '',
    textLength: DEFAULT_TEXT_LENGTH,
    arc: DEFAULT_ARC,
    lang: state.settings.lang,
  });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<World>) => setWorld((w) => ({ ...w, ...patch }));
  const problem = worldProblem(world, lang);
  // Een bewaard concept van een oudere versie heeft deze keuzes nog niet.
  const textLength = world.textLength ?? DEFAULT_TEXT_LENGTH;
  const arc = world.arc ?? DEFAULT_ARC;
  // Een bewaard concept van een oudere versie heeft nog geen verhaaltaal: dan geldt de taal van de app.
  const storyLang = world.lang ?? state.settings.lang;

  const settings = settingsList(lang);
  const rows: (typeof settings)[] = [];
  for (let i = 0; i < settings.length; i += 2) rows.push(settings.slice(i, i + 2));

  const summary = `${settings.find((s) => s.id === world.setting)?.label ?? settings[settings.length - 1].label} · ${world.tones.length ? world.tones.map((x) => toneLabel(x, lang)).join(' + ') : t('new.pickTone')}`;

  return (
    <Screen>
      <TopBar onBack={nav.back} title={t('new.step')} center />
      <View style={{ gap: 10 }}>
        <T weight="display" size={32} style={{ lineHeight: 36 }}>
          {t('new.title')}
        </T>
        <T size={15} color={C.muted} style={{ lineHeight: 21 }}>
          {t('new.intro')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('new.setting')}</Label>
        {rows.map((r) => (
          <Row key={r[0].id} style={{ gap: 10, alignItems: 'stretch' }}>
            {r.map((s) => (
              <Tile key={s.id} label={s.label} hint={s.hint} selected={world.setting === s.id} onPress={() => set({ setting: s.id })} />
            ))}
            {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </Row>
        ))}
        {world.setting === 'eigen' ? (
          <Field
            label={t('new.ownWorld.label')}
            value={world.settingText}
            onChangeText={(x) => set({ settingText: x })}
            placeholder={t('new.ownWorld.placeholder')}
            multiline
          />
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Label right={<T size={13} color={C.muted}>{t('new.tone.pick')}</T>}>{t('new.tone')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {TONES.map((tone) => (
            <Chip key={tone} label={toneLabel(tone, lang)} selected={world.tones.includes(tone)} onPress={() => set({ tones: toggleTone(world.tones, tone) })} />
          ))}
        </Row>
        {world.tones.includes(OWN_TONE) ? (
          <Field
            label={t('new.ownTone.label')}
            value={world.toneText}
            onChangeText={(x) => set({ toneText: x })}
            placeholder={t('new.ownTone.placeholder')}
          />
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('new.storyLanguage')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {LANGS.map((l) => (
            <Chip key={l.id} label={l.label} selected={storyLang === l.id} onPress={() => set({ lang: l.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted}>
          {t('new.storyLanguage.hint')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('new.textLength')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {TEXT_LENGTHS.map((l) => (
            <Chip key={l.id} label={textLengthLabel(l.id, lang)} selected={textLength === l.id} onPress={() => set({ textLength: l.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted}>
          {textLengthHint(textLength, lang)}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('new.arc')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {ARCS.map((a) => (
            <Chip key={a.id} label={arcLabel(a.id, lang)} selected={arc === a.id} onPress={() => set({ arc: a.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted}>
          {arc === 'onbeperkt' ? arcHint(arc, lang) : t('new.arc.withEnding', { hint: arcHint(arc, lang) })}
        </T>
      </View>

      <Field
        label={t('new.wishes.label')}
        extra={t('new.wishes.extra')}
        value={world.wishes}
        onChangeText={(x) => set({ wishes: x })}
        placeholder={t('new.wishes.placeholder')}
        multiline
      />

      <View style={{ gap: 12, marginTop: 4 }}>
        <Row style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: C.card }}>
          <Icon name="book" size={18} color={C.muted} />
          <T size={14} color={C.muted}>
            {t('new.yourAdventure')}
          </T>
          <T size={14} weight="bold" style={{ flex: 1 }} numberOfLines={2}>
            {summary}
          </T>
        </Row>
        {tried && problem ? (
          <T size={14} color={C.hp}>
            {problem}
          </T>
        ) : null}
        <Button
          label={t('new.next')}
          icon="arrow"
          onPress={() => {
            setTried(true);
            if (!problem) nav.push({ name: 'hero', world: { ...world, lang: storyLang } });
          }}
        />
      </View>
    </Screen>
  );
}
