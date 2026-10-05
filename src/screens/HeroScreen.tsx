import React, { useState } from 'react';
import { View } from 'react-native';
import { useNav } from '../nav';
import { useTurns } from '../turns';
import { useT } from '../lang';
import { clearDraft, useDraft } from '../drafts';
import { C } from '../theme';
import { Icon } from '../icons';
import { Button, Chip, Field, Label, Notice, Row, Screen, T, TopBar } from '../ui';
import { heroProblem, settingOf, worldLabel } from '../logic/game';
import { langOf } from '../i18n';
import type { Hero, World } from '../logic/types';

/** Stap 2: je held. Eigenschappen maakt de verteller zelf, onzichtbaar. */
export function HeroScreen({ world }: { world: World }) {
  const nav = useNav();
  const { startAdventure } = useTurns();
  const { t, lang } = useT();
  // Blijft bewaard als je terug gaat naar stap 1 en weer verder.
  const [hero, setHero] = useDraft<Hero>('new-hero', { name: '', className: '', powers: '', looks: '' });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Hero>) => setHero((h) => ({ ...h, ...patch }));
  const classes = settingOf(world.setting, lang).classes;
  const problem = heroProblem(hero, lang);

  return (
    <Screen>
      <TopBar onBack={nav.back} title={t('hero.step')} center />
      <Row style={{ gap: 16 }}>
        <View
          style={{
            width: 96,
            height: 120,
            borderRadius: 16,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: C.dashed,
            backgroundColor: C.card,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 8,
          }}
        >
          <Icon name="user" size={28} color={C.dim} strokeWidth={1.75} />
          <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
            {t('hero.portraitLater')}
          </T>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T weight="display" size={30}>
            {t('hero.who')}
          </T>
          <T size={14} color={C.muted}>
            {worldLabel(world, lang)}
          </T>
        </View>
      </Row>

      <Field label={t('hero.name')} value={hero.name} onChangeText={(x) => set({ name: x })} placeholder={t('hero.name.placeholder')} autoCapitalize="words" />

      <View style={{ gap: 10 }}>
        <Label>{t('hero.class')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {classes.map((c) => (
            <Chip key={c} label={c} selected={hero.className === c} onPress={() => set({ className: c })} />
          ))}
        </Row>
        <Field value={hero.className} onChangeText={(x) => set({ className: x })} placeholder={t('hero.class.placeholder')} />
      </View>

      <View style={{ gap: 10 }}>
        <Field
          label={t('hero.powers.label')}
          value={hero.powers}
          onChangeText={(x) => set({ powers: x })}
          placeholder={t('hero.powers.placeholder')}
          multiline
        />
        <Notice text={t('hero.powers.notice')} />
      </View>

      <Field
        label={t('hero.looks.label')}
        extra={t('hero.looks.extra')}
        value={hero.looks}
        onChangeText={(x) => set({ looks: x })}
        placeholder={t('hero.looks.placeholder')}
        multiline
      />

      <View style={{ gap: 12, marginTop: 4 }}>
        {tried && problem ? (
          <T size={14} color={C.hp}>
            {problem}
          </T>
        ) : null}
        <Button
          label={t('hero.start')}
          icon="arrow"
          onPress={() => {
            setTried(true);
            if (problem) return;
            const id = startAdventure({ ...world, lang: langOf(world.lang ?? lang) }, hero);
            clearDraft('new-world', 'new-hero');
            nav.home();
            nav.push({ name: 'story', id });
          }}
        />
        <T size={13} color={C.muted} style={{ textAlign: 'center', lineHeight: 19 }}>
          {t('hero.firstTurn')}
        </T>
      </View>
    </Screen>
  );
}
