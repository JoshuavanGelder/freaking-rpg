import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useApp, type Model } from '../store';
import { useNav } from '../nav';
import * as gh from '../services/github';
import * as img from '../services/images';
import { formatTokens, summarizeUsage } from '../logic/usage';
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
  const [imageUrl, setImageUrlText] = useState('');
  const [imgCheck, setImgCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [imgBusy, setImgBusy] = useState(false);

  const saveImageUrl = async () => {
    const url = imageUrl.trim();
    setImgBusy(true);
    const problem = await img.checkImageUrl(url);
    if (problem) {
      setImgCheck({ ok: false, text: problem });
    } else {
      await img.setImageUrl(url);
      setImageUrlText('');
      setSettings({ imageUrlSet: true });
      setImgCheck({ ok: true, text: 'Beelden staan klaar.' });
    }
    setImgBusy(false);
  };

  const removeImageUrl = async () => {
    await img.setImageUrl(null);
    setSettings({ imageUrlSet: false });
    setImgCheck(null);
  };

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
  const usage = summarizeUsage(state.usageLog);

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
        <Label>Verbruik per beurt</Label>
        {usage.length ? (
          <Card>
            {usage.map((g) => (
              <View key={g.key} style={{ gap: 2 }}>
                <T size={14} weight="semibold">
                  {g.label} ({g.count}×)
                </T>
                <T size={13} color={C.muted}>
                  {formatTokens(g.avgIn)} gelezen · {formatTokens(g.avgOut)} geschreven · {g.avgSecs} s{g.avgCost !== null ? ` · ca. $${String(g.avgCost).replace('.', ',')}` : ''}
                </T>
              </View>
            ))}
          </Card>
        ) : (
          <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
            Nog niets gemeten. Na je volgende beurt staat hier wat een opening en een gewone beurt kosten.
          </T>
        )}
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          Gemiddelde van je laatste 40 beurten. Geschreven is de tekst plus het nadenken van de verteller; de opening denkt dieper na dan een gewone beurt. De kosten zijn een schatting tegen API-prijzen: je betaalt niets extra, maar het laat zien wat een beurt van je limiet gebruikt.
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
        <Label>Beelden</Label>
        <Row style={{ gap: 8 }}>
          <Chip label="Aan" selected={st.images} onPress={() => setSettings({ images: true })} />
          <Chip label="Uit" selected={!st.images} onPress={() => setSettings({ images: false })} />
        </Row>
        <Card>
          <T size={14} style={{ lineHeight: 20 }}>
            {st.imageUrlSet
              ? 'Je beeldenserver is ingesteld. Beelden zijn 512×512 en worden gemaakt met het goedkoopste model.'
              : 'Plak de URL van je Images-koppeling (je eigen Cloudflare Worker). Die eindigt op /mcp/ plus je geheime code.'}
          </T>
          <Field
            value={imageUrl}
            onChangeText={setImageUrlText}
            placeholder={st.imageUrlSet ? 'Nieuwe URL plakken' : 'https://…workers.dev/mcp/…'}
            secure
            autoCapitalize="none"
          />
          <Button label={imgBusy ? 'Bezig…' : 'URL opslaan en testen'} onPress={saveImageUrl} disabled={!imageUrl.trim() || imgBusy} />
          {st.imageUrlSet ? <Button label="URL verwijderen" variant="ghost" onPress={removeImageUrl} /> : null}
          {imgCheck ? <Notice icon={imgCheck.ok ? 'check' : 'alert'} tone={imgCheck.ok ? 'quiet' : 'warn'} text={imgCheck.text} /> : null}
        </Card>
        <Label>Maximaal per dag</Label>
        <Row style={{ gap: 8 }}>
          {[50, 150, 300].map((n) => (
            <Chip key={n} label={String(n)} selected={st.imageLimit === n} onPress={() => setSettings({ imageLimit: n })} />
          ))}
        </Row>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          Een beeld kost ongeveer 26 van de 10.000 gratis Cloudflare-punten per dag (ook gedeeld met je Images-koppeling in Claude). Het tegoed begint om middernacht (UTC) opnieuw.
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
