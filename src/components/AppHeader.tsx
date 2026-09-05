import { LocaleSwitch } from './LocaleSwitch'
import { ThemeToggle } from './ThemeToggle'
import { useT } from '../i18n'
import { useTheme } from '../lib/theme'

const NAV = [
  { href: '#overview', key: 'nav.overview' },
  { href: '#payments', key: 'nav.payments' },
  { href: '#registry', key: 'nav.registry' },
  { href: '#marketplaces', key: 'nav.marketplaces' },
] as const

export function AppHeader() {
  const { t } = useT()
  const { theme, toggle } = useTheme()
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <a href="#overview" className="flex shrink-0 items-center gap-2">
          <Mark />
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-200 uppercase">
            Observatory
          </span>
        </a>

        <nav className="ml-4 hidden items-center gap-5 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}
              className="font-mono text-[10px] tracking-[0.18em] text-ink-500 uppercase transition hover:text-ink-100">
              {t(n.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </div>
    </header>
  )
}

function Mark() {
  return (
    <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
      <g stroke="var(--ink-500)" strokeWidth="3" strokeLinecap="round">
        <path d="M32 32 L14 18" /><path d="M32 32 L50 18" /><path d="M32 32 L14 46" />
        <path d="M32 32 L50 46" /><path d="M32 32 L32 12" /><path d="M32 32 L32 52" />
      </g>
      <g fill="var(--ink-300)">
        <circle cx="14" cy="18" r="4" /><circle cx="50" cy="18" r="4" />
        <circle cx="14" cy="46" r="4" /><circle cx="50" cy="46" r="4" />
        <circle cx="32" cy="12" r="3" /><circle cx="32" cy="52" r="3" />
      </g>
      <circle cx="32" cy="32" r="9" fill="var(--ink-50)" />
    </svg>
  )
}
