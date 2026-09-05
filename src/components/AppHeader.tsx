import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocaleSwitch } from './LocaleSwitch'
import { ThemeToggle } from './ThemeToggle'
import { useT } from '../i18n'
import type { Key } from '../i18n/en'
import { useTheme } from '../lib/theme'
import { hrefFor, ROUTES, type Route } from '../router'

export function AppHeader({ route }: { route: Route }) {
  const { t } = useT()
  const { theme, toggle } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Stored as the route the menu was opened on, so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<Route | null>(null)
  const open = openAt === route
  const close = useCallback(() => setOpenAt(null), [])

  // Escape and a tap outside also close it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); buttonRef.current?.focus() }
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as globalThis.Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close])

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      {/* relative so the mobile panel can overlay the page instead of growing the header */}
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <a href={hrefFor('overview')} className="flex shrink-0 items-center gap-2">
          <Mark />
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-200 uppercase">Observatory</span>
        </a>

        {/* From md up everything sits inline; below that it collapses behind the menu button. */}
        <nav className="ml-6 hidden min-w-0 flex-1 items-center gap-2 md:flex">
          {ROUTES.map((r) => <Tab key={r} r={r} active={r === route} label={t(`nav.${r}` as Key)} />)}
        </nav>
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <LocaleSwitch />
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpenAt(open ? null : route)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t('nav.close') : t('nav.menu')}
          className="ml-auto grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-ink-800 text-ink-300 transition hover:border-ink-600 hover:text-ink-100 focus-visible:border-ink-500 focus-visible:outline-none md:hidden"
        >
          <Burger open={open} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-10 overflow-hidden border-b border-ink-800 bg-ink-950 md:hidden"
          >
            <nav className="flex flex-col px-4 pt-2 pb-3">
              {ROUTES.map((r) => (
                <a
                  key={r}
                  href={hrefFor(r)}
                  aria-current={r === route ? 'page' : undefined}
                  className={`flex items-center justify-between border-b border-ink-800/60 py-2.5 font-mono text-[11px] tracking-[0.16em] uppercase transition ${r === route ? 'text-ink-50' : 'text-ink-400'}`}
                >
                  {t(`nav.${r}` as Key)}
                  {r === route && <span className="h-1 w-1 rounded-full bg-ink-100" />}
                </a>
              ))}
              <div className="flex items-center justify-between gap-3 pt-3 pb-1">
                <LocaleSwitch />
                <ThemeToggle theme={theme} onToggle={toggle} />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function Tab({ r, active, label }: { r: Route; active: boolean; label: string }) {
  return (
    <a href={hrefFor(r)} aria-current={active ? 'page' : undefined}
      className={`relative shrink-0 rounded px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase transition ${active ? 'text-ink-50' : 'text-ink-500 hover:text-ink-200'}`}>
      {label}
      {active && (
        <motion.span layoutId="nav-underline" transition={{ type: 'spring', stiffness: 480, damping: 38 }}
          className="absolute inset-x-1 -bottom-[9px] h-px bg-ink-100" />
      )}
    </a>
  )
}

/** Three rules that fold into a cross. Stroke geometry is set outright so a stalled
 *  transition cannot leave the button blank. */
function Burger({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <motion.path animate={{ d: open ? 'M4 4 L12 12' : 'M2.5 4.5 L13.5 4.5' }} transition={{ duration: 0.18 }} d="M2.5 4.5 L13.5 4.5" />
        <motion.path animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.12 }} d="M2.5 8 L13.5 8" />
        <motion.path animate={{ d: open ? 'M12 4 L4 12' : 'M2.5 11.5 L13.5 11.5' }} transition={{ duration: 0.18 }} d="M2.5 11.5 L13.5 11.5" />
      </g>
    </svg>
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
