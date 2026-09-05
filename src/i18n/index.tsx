import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type Key } from './en'
import { ja } from './ja'
import { ko } from './ko'
import { zh } from './zh'

export const LOCALES = ['en', 'ko', 'ja', 'zh'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABEL: Record<Locale, string> = { en: 'EN', ko: '한국어', ja: '日本語', zh: '中文' }
/** Compact codes used where horizontal space is tight. */
export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', ko: 'KO', ja: 'JA', zh: 'ZH' }
/** BCP 47 tag passed to Intl */
export const INTL_TAG: Record<Locale, string> = { en: 'en', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN' }

const DICTS = { en, ko, ja, zh }
const KEY = 'aeo-locale'

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale
  } catch { /* ignore */ }
  const nav = navigator.language?.toLowerCase() ?? 'en'
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('zh')) return 'zh'
  return 'en'
}

export type Translate = (key: Key, vars?: Record<string, string | number>) => string

interface Ctx { locale: Locale; setLocale: (l: Locale) => void; t: Translate; tag: string }
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detect)
  useEffect(() => {
    try { localStorage.setItem(KEY, locale) } catch { /* ignore */ }
    document.documentElement.lang = INTL_TAG[locale]
  }, [locale])
  const value = useMemo<Ctx>(() => {
    const dict = DICTS[locale]
    const t: Translate = (key, vars) => {
      let s: string = dict[key] ?? en[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    }
    return { locale, setLocale, t, tag: INTL_TAG[locale] }
  }, [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside I18nProvider')
  return ctx
}
