import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { money as formatMoney, tr, type L, type Lang } from '../engine';
import { en, zh, type StringKey } from './strings';

export const LANG_KEY = 'university-parking-tycoon:lang';
const DICTS: Record<Lang, Record<StringKey, string>> = { en, zh };

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '简体中文' },
];

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* storage unavailable */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}

export type Vars = Record<string, string | number>;

export interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Interface string by key, with {placeholder} substitution. */
  t: (key: StringKey, vars?: Vars) => string;
  /** Pick the current language from engine-generated bilingual text. */
  tx: (text: L) => string;
  /** Money formatted for the current language. */
  money: (n: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* preference just won't persist */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = DICTS[lang]['app.title'];
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => interpolate(DICTS[lang][key] ?? en[key], vars),
      tx: (text) => tr(text, lang),
      money: (n) => formatMoney(n, lang),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
