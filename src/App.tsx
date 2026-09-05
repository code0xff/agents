import Lenis from 'lenis'
import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { AppHeader } from './components/AppHeader'
import { MarketplacesPanel } from './features/marketplaces/MarketplacesPanel'
import { OverviewPanel } from './features/overview/OverviewPanel'
import { PaymentsPanel } from './features/payments/PaymentsPanel'
import { paymentsPerMinute, usePayments } from './features/payments/usePayments'
import { RegistryLog } from './features/registry/RegistryLog'
import { useT } from './i18n'
import { useMediaQuery } from './lib/useMediaQuery'
import { usePwa } from './lib/usePwa'

export default function App() {
  const { t } = useT()
  const { online } = usePwa()
  // Native momentum scrolling is better on touch, and it avoids fighting nested scrollers.
  const smoothOk = useMediaQuery('(min-width: 768px) and (pointer: fine)')

  // One payments stream feeds both the overview rate and the flow panel.
  const payments = usePayments()
  const perMin = useMemo(() => paymentsPerMinute(payments), [payments])

  useEffect(() => {
    if (!smoothOk) return
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = 0
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [smoothOk])

  const { scrollY } = useScroll()
  const gridY = useTransform(scrollY, [0, 1200], [0, -140])

  return (
    <div className="relative min-h-full">
      <motion.div style={{ y: gridY }} className="bg-grid pointer-events-none fixed inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_70%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px animate-scan bg-gradient-to-r from-transparent via-ink-300/30 to-transparent" />

      <AppHeader />

      <section id="overview" className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-16 sm:pb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'animate-pulse bg-ink-200' : 'bg-ink-600'}`} />
          {online ? t('hero.status') : t('pwa.offline')}
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 max-w-3xl text-3xl leading-[1.05] font-light tracking-tight text-ink-50 sm:text-5xl md:text-6xl">
          {t('header.title')} <span className="text-ink-500">{t('header.titleAccent')}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.8 }}
          className="mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
          {t('header.tagline')}
        </motion.p>
      </section>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-16 sm:gap-6 sm:px-6 sm:pb-24">
        <OverviewPanel observedPerMin={perMin} blocksScanned={payments.blocksScanned} />
        <div id="payments"><PaymentsPanel state={payments} /></div>
        <div id="registry"><RegistryLog /></div>
        <div id="marketplaces"><MarketplacesPanel /></div>
      </main>

      <footer className="border-t border-ink-800 px-4 py-8 text-center font-mono text-[10px] leading-relaxed tracking-wider text-ink-600 sm:px-6">
        <p className="break-words">{t('footer.sources')}</p>
        <p className="mt-1">{t('footer.nobackend')}</p>
      </footer>
    </div>
  )
}
