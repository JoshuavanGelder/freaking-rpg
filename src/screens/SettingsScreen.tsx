import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useApp, type Model } from '../store';
import { useNav } from '../nav';
import { useT } from '../lang';
import { LANGS, type Key } from '../i18n';
import * as gh from '../services/github';
import * as img from '../services/images';
import { formatTokens, summarizeUsage } from '../logic/usage';
import { C } from '../theme';
import { Button, Card, Chip, Field, Label, Notice, Row, Screen, T, TopBar } from '../ui';

const MODELS: { id: Model; label: string; hint: Key }[] = [
  { id: 'sonnet', label: 'Sonnet', hint: 'model.sonnet.hint' },
  { id: 'haiku', label: 'Haiku', hint: 'model.haiku.hint' },
  { id: 'opus', label: 'Opus', hint: 'model.opus.hint' },
];

export function SettingsScreen() {
  const { state, setSettings } = useApp();
  const nav = useNav();
  const { t, lang } = useT();
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
      setImgCheck({ ok: true, text: t('settings.images.ready') });
    }
    setImgBusy(false);
  };

  const removeImageUrl = async () => {
    await img.setImageUrl(null);
    setSettings({ imageUrlSet: false });
    setImgCheck(null);
  };

  useEffect(() => {
    gh.getToken().then((tok) => setHasToken(!!tok));
  }, []);

  const test = async () => {
    setBusy(true);
    const problem = await gh.checkRepo(repo);
    setCheck(problem ? { ok: false, text: problem } : { ok: true, text: t('settings.github.connected', { repo: `${repo.owner}/${repo.repo}` }) });
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
  const usage = summarizeUsage(state.usageLog, lang);

  return (
    <Screen gap={24}>
      <TopBar onBack={nav.back} title={t('settings.title')} center />

      <View style={{ gap: 10 }}>
        <Label>{t('settings.language')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {LANGS.map((l) => (
            <Chip key={l.id} label={l.label} selected={lang === l.id} onPress={() => setSettings({ lang: l.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {t('settings.language.hint')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('settings.narrator')}</Label>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {MODELS.map((m) => (
            <Chip key={m.id} label={m.label} selected={st.model === m.id} onPress={() => setSettings({ model: m.id })} />
          ))}
        </Row>
        <T size={13} color={C.muted}>
          {t(model.hint)}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('settings.usage')}</Label>
        {usage.length ? (
          <Card>
            {usage.map((g) => (
              <View key={g.key} style={{ gap: 2 }}>
                <T size={14} weight="semibold">
                  {t('usage.group', { label: g.label, n: g.count })}
                </T>
                <T size={13} color={C.muted}>
                  {t('usage.line', {
                    read: formatTokens(g.avgIn, lang),
                    written: formatTokens(g.avgOut, lang),
                    secs: g.avgSecs,
                    cost: g.avgCost !== null ? t('usage.cost', { cost: lang === 'en' ? String(g.avgCost) : String(g.avgCost).replace('.', ',') }) : '',
                  })}
                </T>
              </View>
            ))}
          </Card>
        ) : (
          <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
            {t('usage.none')}
          </T>
        )}
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {t('usage.note')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('settings.warm')}</Label>
        <Row style={{ gap: 8 }}>
          <Chip label={t('common.on')} selected={st.warm} onPress={() => setSettings({ warm: true })} />
          <Chip label={t('common.off')} selected={!st.warm} onPress={() => setSettings({ warm: false })} />
        </Row>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {t('settings.warm.text')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('settings.images')}</Label>
        <Row style={{ gap: 8 }}>
          <Chip label={t('common.on')} selected={st.images} onPress={() => setSettings({ images: true })} />
          <Chip label={t('common.off')} selected={!st.images} onPress={() => setSettings({ images: false })} />
        </Row>
        <Card>
          <T size={14} style={{ lineHeight: 20 }}>
            {st.imageUrlSet
              ? t('settings.images.set')
              : t('settings.images.unset')}
          </T>
          <Field
            value={imageUrl}
            onChangeText={setImageUrlText}
            placeholder={st.imageUrlSet ? t('settings.images.newUrl') : 'https://…workers.dev/mcp/…'}
            secure
            autoCapitalize="none"
          />
          <Button label={imgBusy ? t('common.working') : t('settings.images.save')} onPress={saveImageUrl} disabled={!imageUrl.trim() || imgBusy} />
          {st.imageUrlSet ? <Button label={t('settings.images.remove')} variant="ghost" onPress={removeImageUrl} /> : null}
          {imgCheck ? <Notice icon={imgCheck.ok ? 'check' : 'alert'} tone={imgCheck.ok ? 'quiet' : 'warn'} text={imgCheck.text} /> : null}
        </Card>
        <Label>{t('settings.images.perDay')}</Label>
        <Row style={{ gap: 8 }}>
          {[50, 150, 300].map((n) => (
            <Chip key={n} label={String(n)} selected={st.imageLimit === n} onPress={() => setSettings({ imageLimit: n })} />
          ))}
        </Row>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {t('settings.images.quotaNote')}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Label>GitHub</Label>
        <Card>
          <T size={14} style={{ lineHeight: 20 }}>
            {hasToken ? t('settings.github.has') : t('settings.github.none')}
          </T>
          <Field
            value={token}
            onChangeText={setToken}
            placeholder={hasToken ? t('settings.github.newToken') : t('settings.github.pasteToken')}
            secure
            autoCapitalize="none"
          />
          <Button label={busy ? t('common.working') : t('settings.github.save')} onPress={save} disabled={!token.trim() || busy} />
          {hasToken ? <Button label={t('settings.github.test')} variant="outline" onPress={test} disabled={busy} /> : null}
          {check ? <Notice icon={check.ok ? 'check' : 'alert'} tone={check.ok ? 'quiet' : 'warn'} text={check.text} /> : null}
        </Card>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {t('settings.github.note', { repo: st.repo })}
        </T>
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('settings.owner')} value={st.owner} onChangeText={(x) => setSettings({ owner: x.trim() })} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('settings.repo')} value={st.repo} onChangeText={(x) => setSettings({ repo: x.trim() })} autoCapitalize="none" />
          </View>
        </Row>
      </View>

      <View style={{ gap: 10 }}>
        <Label>{t('settings.claudeToken')}</Label>
        <T size={14} color={C.muted} style={{ lineHeight: 20 }}>
          {t('settings.claudeToken.before')}
          <T size={14} weight="semibold">
            bash scripts/claude-token.sh
          </T>
          {t('settings.claudeToken.after')}
        </T>
        <Button
          label={t('settings.claudeToken.open')}
          variant="outline"
          onPress={() => Linking.openURL(`https://github.com/${st.owner}/${st.repo}#eenmalig-instellen`)}
        />
      </View>
    </Screen>
  );
}
