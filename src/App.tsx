import Lenis from 'lenis'
import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { LocaleSwitch } from './components/LocaleSwitch'
import { ThemeToggle } from './components/ThemeToggle'
import { MarketplacesPanel } from './features/marketplaces/MarketplacesPanel'
import { PaymentsPanel } from './features/payments/PaymentsPanel'
import { RegistryLog } from './features/registry/RegistryLog'
import { useT } from './i18n'
import { useTheme } from './lib/theme'

export default function App() {
  const { theme, toggle } = useTheme()
  const { t } = useT()
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = 0
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])
  const { scrollY } = useScroll()
  const gridY = useTransform(scrollY, [0, 1000], [0, -120])

  return (
    <div className="relative min-h-full">
      <motion.div style={{ y: gridY }} className="bg-grid pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px animate-scan bg-gradient-to-r from-transparent via-ink-300/40 to-transparent" />

      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-6 pt-14 pb-10">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="font-mono text-[10px] tracking-[0.3em] text-ink-500 uppercase">
            {t('header.tagline')}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="mt-2 text-3xl font-light tracking-tight text-ink-50 md:text-5xl">
            {t('header.title')} <span className="text-ink-400">{t('header.titleAccent')}</span>
          </motion.h1>
        </div>
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-4 font-mono text-[11px] tracking-wider text-ink-500 uppercase">
          <a href="#marketplaces" className="hidden hover:text-ink-100 lg:inline">{t('nav.marketplaces')}</a>
          <a href="#registry" className="hidden hover:text-ink-100 lg:inline">{t('nav.registry')}</a>
          <a href="#payments" className="hidden hover:text-ink-100 lg:inline">{t('nav.payments')}</a>
          <LocaleSwitch />
          <ThemeToggle theme={theme} onToggle={toggle} />
        </motion.nav>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-24">
        <div id="marketplaces"><MarketplacesPanel /></div>
        <div id="payments"><PaymentsPanel /></div>
        <div id="registry"><RegistryLog /></div>
      </main>

      <footer className="border-t border-ink-800 px-6 py-6 text-center font-mono text-[10px] leading-relaxed tracking-wider text-ink-600">
        <p>{t('footer.sources')}</p>
        <p>{t('footer.nobackend')}</p>
      </footer>
    </div>
  )
}
