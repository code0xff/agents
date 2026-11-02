import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocaleSwitch } from './LocaleSwitch'
import { ThemeToggle } from './ThemeToggle'
import { useT } from '../i18n'
import type { Key } from '../i18n/en'
import { useTheme } from '../lib/theme'
import { applyUpdate, usePwaUpdate } from '../lib/usePwa'
import { hrefFor, ROUTES, type Route } from '../router'
import { iconBtn, navItem } from './ui'

const REPO = 'https://github.com/code0xff/agents'

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
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/95 backdrop-blur-sm">
      {/* relative so the mobile panel can overlay the page instead of growing the header */}
      <div className="relative mx-auto flex h-12 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <a href={hrefFor('overview')} className="flex shrink-0 items-center gap-2">
          <Mark />
          <span className="text-[14px] font-semibold tracking-[.01em] text-ink-100">Observatory</span>
        </a>

        {/* From md up everything sits inline; below that it collapses behind the menu button. */}
        <nav className="ml-3 hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
          {ROUTES.map((r) => <Tab key={r} r={r} active={r === route} label={t(`nav.${r}` as Key)} />)}
        </nav>
        <div className="ml-auto hidden shrink-0 items-center gap-1 md:flex">
          <UpdateButton />
          <LocaleSwitch />
          <ThemeToggle theme={theme} onToggle={toggle} />
          <SourceLink label={t('nav.source')} />
        </div>

        {/* Kept out of the menu: a build waiting behind a closed hamburger says nothing. */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
          <UpdateButton />
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpenAt(open ? null : route)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('nav.close') : t('nav.menu')}
            className={iconBtn}
          >
            <Burger open={open} />
          </button>
        </div>
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
            className="absolute inset-x-0 top-full z-10 overflow-hidden border-b border-ink-800 bg-ink-900 md:hidden"
          >
            <nav className="flex flex-col gap-0.5 px-3 pt-2 pb-3">
              {ROUTES.map((r) => (
                <a
                  key={r}
                  href={hrefFor(r)}
                  aria-current={r === route ? 'page' : undefined}
                  className={`${navItem(r === route)} h-9 justify-between`}
                >
                  {t(`nav.${r}` as Key)}
                  {r === route && <span className="h-1 w-1 rounded-full bg-ink-100" />}
                </a>
              ))}
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-800 px-1 pt-3 pb-1">
                <LocaleSwitch />
                <div className="flex items-center gap-2">
                  <ThemeToggle theme={theme} onToggle={toggle} />
                  <SourceLink label={t('nav.source')} />
                </div>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/**
 * Shown only once a newer build has activated. The worker used to reload the page by itself the
 * moment it took over, which landed as an unexplained refresh mid-read; now the reload waits for
 * this button or for the tab to be hidden.
 */
function UpdateButton() {
  const { t } = useT()
  const ready = usePwaUpdate()
  if (!ready) return null
  return (
    <button type="button" onClick={applyUpdate} aria-label={t('pwa.update')} title={t('pwa.update')}
      className={`${iconBtn} !bg-ink-100 !text-ink-950 hover:opacity-85`}>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M13 8A5 5 0 1 1 11.4 4.3" />
        <path d="M13.3 2.2v2.8h-2.8" />
      </svg>
    </button>
  )
}

function SourceLink({ label }: { label: string }) {
  return (
    <a href={REPO} target="_blank" rel="noreferrer noopener" aria-label={label} title={label}
      className={iconBtn}>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.14.46.55.38A8 8 0 0 0 8 0Z" />
      </svg>
    </a>
  )
}

function Tab({ r, active, label }: { r: Route; active: boolean; label: string }) {
  return (
    <a href={hrefFor(r)} aria-current={active ? 'page' : undefined}
      className={navItem(active)}>
      {label}
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

/** Radar mark: ring, sweep and centre on a 32-unit grid. Shared with favicon.svg and the app icons. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5 text-ink-100" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16 3a13 13 0 1 1 0 26 13 13 0 0 1 0-26Zm0 3a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      <path d="M16 16V6.5A9.5 9.5 0 0 1 25.5 16Z" />
      <circle cx="16" cy="16" r="2.5" />
    </svg>
  )
}
