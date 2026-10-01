import React, { useState } from 'react';
import { View } from 'react-native';
import { useNav } from '../nav';
import { useDraft } from '../drafts';
import { C } from '../theme';
import { Icon } from '../icons';
import { Button, Chip, Field, Label, Row, Screen, T, Tile, TopBar } from '../ui';
import { OWN_TONE, SETTINGS, TONES, settingOf, toggleTone, worldProblem } from '../logic/game';
import type { World } from '../logic/types';

/** Stap 1: wereld en toon kiezen. */
export function NewScreen() {
  const nav = useNav();
  // Blijft bewaard als je naar stap 2 gaat en terugkomt (of de app tussendoor sluit).
  const [world, setWorld] = useDraft<World>('new-world', { setting: 'fantasy', settingText: '', tones: ['Humoristisch'], toneText: '', wishes: '' });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<World>) => setWorld((w) => ({ ...w, ...patch }));
  const problem = worldProblem(world);

  const rows: (typeof SETTINGS)[] = [];
  for (let i = 0; i < SETTINGS.length; i += 2) rows.push(SETTINGS.slice(i, i + 2));

  const summary = `${world.setting === 'eigen' ? 'Eigen wereld' : settingOf(world.setting).label} · ${world.tones.length ? world.tones.join(' + ') : 'kies een toon'}`;

  return (
    <Screen>
      <TopBar onBack={nav.back} title="Stap 1 van 2" center />
      <View style={{ gap: 10 }}>
        <T weight="display" size={32} style={{ lineHeight: 36 }}>
          Waar speelt je avontuur?
        </T>
        <T size={15} color={C.muted} style={{ lineHeight: 21 }}>
          Kies een wereld en de toon. De verteller houdt zich er het hele avontuur aan.
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Setting</Label>
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
            label="Beschrijf je wereld"
            value={world.settingText}
            onChangeText={(t) => set({ settingText: t })}
            placeholder="Bijv. een drijvende stad op de rug van een reuzenschildpad"
            multiline
          />
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Label right={<T size={13} color={C.muted}>Kies er 1 of 2</T>}>Toon</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {TONES.map((t) => (
            <Chip key={t} label={t} selected={world.tones.includes(t)} onPress={() => set({ tones: toggleTone(world.tones, t) })} />
          ))}
        </Row>
        {world.tones.includes(OWN_TONE) ? (
          <Field
            label="Beschrijf de toon"
            value={world.toneText}
            onChangeText={(t) => set({ toneText: t })}
            placeholder="Bijv. als een natuurdocumentaire over goblins"
          />
        ) : null}
      </View>

      <Field
        label="Extra wensen"
        extra="optioneel"
        value={world.wishes}
        onChangeText={(t) => set({ wishes: t })}
        placeholder="Iets wat de verteller moet weten, bijv. 'geen spinnen' of 'veel plotwendingen'"
        multiline
      />

      <View style={{ gap: 12, marginTop: 4 }}>
        <Row style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: C.card }}>
          <Icon name="book" size={18} color={C.muted} />
          <T size={14} color={C.muted}>
            Jouw avontuur:
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
          label="Verder: je personage"
          icon="arrow"
          onPress={() => {
            setTried(true);
            if (!problem) nav.push({ name: 'hero', world });
          }}
        />
      </View>
    </Screen>
  );
}
