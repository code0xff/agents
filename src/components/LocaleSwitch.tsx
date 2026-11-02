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
        className="h-7 appearance-none rounded-lg border-0 bg-transparent pr-6 pl-7 text-[12px] font-medium text-ink-400 transition-colors duration-[120ms] outline-none hover:bg-ink-800 hover:text-ink-100 focus-visible:bg-ink-800 focus-visible:text-ink-100"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-ink-900 text-ink-100">{LOCALE_LABEL[l]}</option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-ink-400">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <svg viewBox="0 0 12 12" aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 h-2.5 w-2.5 -translate-y-1/2 text-ink-400">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
