import React, { useState } from 'react';
import { View } from 'react-native';
import { useNav } from '../nav';
import { useTurns } from '../turns';
import { C } from '../theme';
import { Icon } from '../icons';
import { Button, Chip, Field, Label, Notice, Row, Screen, T, TopBar } from '../ui';
import { heroProblem, settingOf, worldLabel } from '../logic/game';
import type { Hero, World } from '../logic/types';

/** Stap 2: je held. Eigenschappen maakt de verteller zelf, onzichtbaar. */
export function HeroScreen({ world }: { world: World }) {
  const nav = useNav();
  const { startAdventure } = useTurns();
  const [hero, setHero] = useState<Hero>({ name: '', className: '', powers: '', looks: '' });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Hero>) => setHero((h) => ({ ...h, ...patch }));
  const classes = settingOf(world.setting).classes;
  const problem = heroProblem(hero);

  return (
    <Screen>
      <TopBar onBack={nav.back} title="Stap 2 van 2" center />
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
            Portret volgt later
          </T>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T weight="display" size={30}>
            Wie ben jij?
          </T>
          <T size={14} color={C.muted}>
            {worldLabel(world)}
          </T>
        </View>
      </Row>

      <Field label="Naam" value={hero.name} onChangeText={(t) => set({ name: t })} placeholder="Bijv. Fenna Vlugvinger" autoCapitalize="words" />

      <View style={{ gap: 10 }}>
        <Label>Klasse</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {classes.map((c) => (
            <Chip key={c} label={c} selected={hero.className === c} onPress={() => set({ className: c })} />
          ))}
        </Row>
        <Field value={hero.className} onChangeText={(t) => set({ className: t })} placeholder="Of typ je eigen klasse" />
      </View>

      <View style={{ gap: 10 }}>
        <Field
          label="Krachten en zwaktes"
          value={hero.powers}
          onChangeText={(t) => set({ powers: t })}
          placeholder="Wat kan je held, en wat juist niet? Bijv. supersnel en ziet alles in slow motion, maar wordt doodmoe en heeft altijd honger"
          multiline
        />
        <Notice text="De verteller maakt hier eigenschappen van die bij jouw held passen, en houdt ze op de achtergrond bij. Je ziet geen cijfers." />
      </View>

      <Field
        label="Uiterlijk"
        extra="voor je portret"
        value={hero.looks}
        onChangeText={(t) => set({ looks: t })}
        placeholder="Bijv. korte rode vlechten, te grote leren jas, litteken op de kin"
        multiline
      />

      <View style={{ gap: 12, marginTop: 4 }}>
        {tried && problem ? (
          <T size={14} color={C.hp}>
            {problem}
          </T>
        ) : null}
        <Button
          label="Begin het avontuur"
          icon="arrow"
          onPress={() => {
            setTried(true);
            if (problem) return;
            const id = startAdventure(world, hero);
            nav.home();
            nav.push({ name: 'story', id });
          }}
        />
        <T size={13} color={C.muted} style={{ textAlign: 'center', lineHeight: 19 }}>
          De eerste beurt duurt 1 à 2 minuten: de verteller moet nog wakker worden.
        </T>
      </View>
    </Screen>
  );
}
