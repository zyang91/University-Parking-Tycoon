import type { L, Lang } from './types';

/** Construct a bilingual text value. */
export const l = (en: string, zh: string): L => ({ en, zh });

/** Pick the text for a language (falls back to English). */
export const tr = (text: L, lang: Lang): string => text[lang] || text.en;

/** Join fragments into a natural list in each language. */
export function joinL(items: L[]): L {
  const en = items.map((i) => i.en);
  const zh = items.map((i) => i.zh);
  const enList =
    en.length <= 1
      ? en.join('')
      : en.length === 2
        ? `${en[0]} and ${en[1]}`
        : `${en.slice(0, -1).join(', ')}, and ${en[en.length - 1]}`;
  const zhList = zh.length <= 1 ? zh.join('') : `${zh.slice(0, -1).join('，')}，并${zh[zh.length - 1]}`;
  return { en: enList, zh: zhList };
}

/** Concatenate bilingual parts with per-language separators. */
export function concatL(parts: L[], sepEn = ' ', sepZh = ''): L {
  return { en: parts.map((p) => p.en).join(sepEn), zh: parts.map((p) => p.zh).join(sepZh) };
}

/** Compact money formatting. Chinese uses 万 (10,000) units. */
export function money(n: number, lang: Lang = 'en'): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (lang === 'zh') {
    if (a >= 10_000) {
      const w = a / 10_000;
      return `${sign}$${w >= 100 ? Math.round(w).toLocaleString() : w.toFixed(1).replace(/\.0$/, '')}万`;
    }
    return `${sign}$${Math.round(a)}`;
  }
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1000).toLocaleString()}k`;
  return `${sign}$${Math.round(a)}`;
}
