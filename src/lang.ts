// De taalinstelling in React: `const { t, tn, lang } = useT();` in elk scherm. Code buiten React gebruikt tt() uit i18n.ts.
import { useMemo } from 'react';
import { useApp } from './store';
import { langOf, t as translate, tn as translatePlural, type Key, type Lang, type PluralBase, type Vars } from './i18n';

export type Translate = {
  lang: Lang;
  t: (key: Key, vars?: Vars) => string;
  tn: (base: PluralBase, n: number, vars?: Vars) => string;
};

export function useT(): Translate {
  const { state } = useApp();
  const lang = langOf(state.settings.lang);
  return useMemo(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      tn: (base, n, vars) => translatePlural(lang, base, n, vars),
    }),
    [lang],
  );
}
