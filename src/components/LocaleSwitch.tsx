import { LOCALES, LOCALE_LABEL, useT, type Locale } from '../i18n'

/**
 * Native select: compact at any width, keyboard and screen-reader accessible for free,
 * and it opens as the platform picker on touch.
 */
export function LocaleSwitch() {
  const { locale, setLocale, t } = useT()
  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t('locale.label')}
        className="appearance-none rounded-full border border-ink-800 bg-transparent py-1 pr-6 pl-2.5 font-mono text-[10px] tracking-wider text-ink-300 transition outline-none hover:border-ink-600 hover:text-ink-100 focus-visible:border-ink-500"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-ink-900 text-ink-100">{LOCALE_LABEL[l]}</option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 h-2.5 w-2.5 -translate-y-1/2 text-ink-500">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
