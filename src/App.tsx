import Lenis from 'lenis'
import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { AppHeader } from './components/AppHeader'
import type { ChainKey } from './data/chains'
import { PageHead } from './components/PageHead'
import { MarketplacesPanel } from './features/marketplaces/MarketplacesPanel'
import { OverviewPanel } from './features/overview/OverviewPanel'
import { PaymentsPanel } from './features/payments/PaymentsPanel'
import { paymentsPerMinute, usePayments } from './features/payments/usePayments'
import { RegistryLog } from './features/registry/RegistryLog'
import { useRegistry } from './features/registry/useRegistry'
import { useT } from './i18n'
import type { Key } from './i18n/en'
import { spanFrom } from './lib/format'
import { useMediaQuery } from './lib/useMediaQuery'
import { usePwa } from './lib/usePwa'
import { useHashRoute, type Route } from './router'

const REGISTRY_CHAINS: readonly ChainKey[] = ['base', 'bnb']

export default function App() {
  const { t } = useT()
  const route = useHashRoute()
  const { online } = usePwa()
  // Native momentum scrolling is better on touch, and it avoids fighting nested scrollers.
  const smoothOk = useMediaQuery('(min-width: 768px) and (pointer: fine)')

  // Both live streams sit above the router so navigating between pages neither restarts
  // the block scan nor loses the events already collected.
  const payments = usePayments()
  const registry = useRegistry(REGISTRY_CHAINS)
  const perMin = useMemo(() => paymentsPerMinute(payments), [payments])
  // The rate covers the retained beats, so the overview says how far back those reach.
  const observedSpan = useMemo(() => spanFrom(payments.beats[payments.beats.length - 1]), [payments.beats])

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

      <AppHeader route={route} />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-8 pb-16 sm:gap-6 sm:px-6 sm:pt-12 sm:pb-24">
        <PageHead
          title={t(`nav.${route}` as Key)}
          lead={t(`page.${route}.lead` as Key)}
          status={
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'animate-pulse bg-ink-200' : 'bg-ink-600'}`} />
              {online ? t('hero.status') : t('pwa.offline')}
            </span>
          }
        />

        {/* Keyed, but deliberately without AnimatePresence: an exit animation that stalls
            (a throttled background tab, reduced motion) would keep the previous page on
            screen. Swapping on the key change and animating only the entry cannot get stuck. */}
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4 sm:gap-6"
        >
          <Page route={route} payments={payments} registry={registry} perMin={perMin} observedSpan={observedSpan} />
        </motion.div>
      </main>

      <footer className="border-t border-ink-800 px-4 py-8 text-center font-mono text-[10px] leading-relaxed tracking-wider text-ink-500 sm:px-6">
        <p className="break-words">{t('footer.sources')}</p>
      </footer>
    </div>
  )
}

function Page({ route, payments, registry, perMin, observedSpan }: {
  route: Route
  payments: ReturnType<typeof usePayments>
  registry: ReturnType<typeof useRegistry>
  perMin: number | null
  observedSpan: string | null
}) {
  switch (route) {
    case 'payments': return <PaymentsPanel state={payments} />
    case 'registry': return <RegistryLog state={registry} />
    case 'marketplaces': return <MarketplacesPanel />
    default: return <OverviewPanel observedPerMin={perMin} observedSpan={observedSpan} />
  }
}
