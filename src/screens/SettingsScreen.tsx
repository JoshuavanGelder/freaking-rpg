import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useApp, type Model } from '../store';
import { useNav } from '../nav';
import * as gh from '../services/github';
import { C } from '../theme';
import { Button, Card, Chip, Field, Label, Notice, Row, Screen, T, TopBar } from '../ui';

const MODELS: { id: Model; label: string; hint: string }[] = [
  { id: 'sonnet', label: 'Sonnet', hint: 'Aanbevolen: goede verhalen, vlot' },
  { id: 'haiku', label: 'Haiku', hint: 'Snelst, eenvoudiger verhalen, spaart je limiet' },
  { id: 'opus', label: 'Opus', hint: 'Rijkste verhalen, trager en zwaarder voor je limiet' },
];

export function SettingsScreen() {
  const { state, setSettings } = useApp();
  const nav = useNav();
  const st = state.settings;
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const repo = { owner: st.owner, repo: st.repo };

  useEffect(() => {
    gh.getToken().then((t) => setHasToken(!!t));
  }, []);

  const test = async () => {
    setBusy(true);
    const problem = await gh.checkRepo(repo);
    setCheck(problem ? { ok: false, text: problem } : { ok: true, text: `Verbonden met ${repo.owner}/${repo.repo}.` });
    setBusy(false);
  };

  const save = async () => {
    if (!token.trim()) return;
    await gh.setToken(token.trim());
    setToken('');
    setHasToken(true);
    await test();
  };

  const model = MODELS.find((m) => m.id === st.model) ?? MODELS[0];

  return (
    <Screen gap={24}>
      <TopBar onBack={nav.back} title="Instellingen" center />

      <View style={{ gap: 10 }}>
        <Label>Verteller</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {MODELS.map((m) => (
            <Chip key={m.id} label={m.label} selected={st.model === m.id} onPress={() => setSettings({ model: m.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted}>
          {model.hint}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Warme verteller</Label>
        <Row style={{ gap: 8 }}>
          <Chip label="Aan" selected={st.warm} onPress={() => setSettings({ warm: true })} />
          <Chip label="Uit" selected={!st.warm} onPress={() => setSettings({ warm: false })} />
        </Row>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          Maakt de verteller wakker zodra je de app opent, zodat een beurt ongeveer 20 seconden duurt in plaats van 1 à 2 minuten. Hij gaat na 10 minuten stilte weer slapen.
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>GitHub</Label>
        <Card>
          <T size={14} style={{ lineHeight: 20 }}>
            {hasToken ? 'Er staat een GitHub-token op deze telefoon.' : 'Nog geen GitHub-token. Zonder token kan de app de verteller niet bereiken.'}
          </T>
          <Field
            value={token}
            onChangeText={setToken}
            placeholder={hasToken ? 'Nieuw token plakken' : 'Plak hier je GitHub-token'}
            secure
            autoCapitalize="none"
          />
          <Button label={busy ? 'Bezig…' : 'Token opslaan en testen'} onPress={save} disabled={!token.trim() || busy} />
          {hasToken ? <Button label="Verbinding testen" variant="outline" onPress={test} disabled={busy} /> : null}
          {check ? <Notice icon={check.ok ? 'check' : 'alert'} tone={check.ok ? 'quiet' : 'warn'} text={check.text} /> : null}
        </Card>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          Maak een fine-grained token met alleen toegang tot {st.repo}, rechten Contents en Actions: Read and write.
        </T>
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Eigenaar" value={st.owner} onChangeText={(t) => setSettings({ owner: t.trim() })} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Repo" value={st.repo} onChangeText={(t) => setSettings({ repo: t.trim() })} autoCapitalize="none" />
          </View>
        </Row>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Claude-token</Label>
        <T size={14} color={C.muted} style={{ lineHeight: 20 }}>
          De verteller draait op je eigen Claude-abonnement. Het token zet je eenmalig als geheim in GitHub: open een Codespace op deze repo en draai{' '}
          <T size={14} weight="semibold">
            bash scripts/claude-token.sh
          </T>
          . Na een jaar doe je dat opnieuw.
        </T>
        <Button
          label="Uitleg openen"
          variant="outline"
          onPress={() => Linking.openURL(`https://github.com/${st.owner}/${st.repo}#eenmalig-instellen`)}
        />
      </View>
    </Screen>
  );
}
