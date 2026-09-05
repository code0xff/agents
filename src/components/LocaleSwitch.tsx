import { motion } from 'motion/react'
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT, useT } from '../i18n'

export function LocaleSwitch() {
  const { locale, setLocale } = useT()
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-ink-800 p-0.5">
      {LOCALES.map((l) => (
        <button key={l} onClick={() => setLocale(l)} aria-label={LOCALE_LABEL[l]} aria-pressed={locale === l}
          className={`relative rounded-full px-1.5 py-0.5 font-mono text-[10px] tracking-wider transition sm:px-2 ${locale === l ? 'text-ink-950' : 'text-ink-400 hover:text-ink-100'}`}>
          {locale === l && (
            <motion.span layoutId="locale-pill" transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="absolute inset-0 rounded-full bg-ink-100" />
          )}
          <span className="relative sm:hidden">{LOCALE_SHORT[l]}</span>
          <span className="relative hidden sm:inline">{LOCALE_LABEL[l]}</span>
        </button>
      ))}
    </div>
  )
}
