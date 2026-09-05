import Lenis from 'lenis'
import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { MarketplacesPanel } from './features/marketplaces/MarketplacesPanel'
import { PaymentsPanel } from './features/payments/PaymentsPanel'
import { RegistryLog } from './features/registry/RegistryLog'

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = 0
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])
  const { scrollY } = useScroll()
  const gridY = useTransform(scrollY, [0, 1000], [0, -120])

  return (
    <div className="relative min-h-full">
      <motion.div style={{ y: gridY }} className="bg-grid pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px animate-scan bg-gradient-to-r from-transparent via-ink-300/40 to-transparent" />

      <header className="mx-auto flex max-w-7xl items-end justify-between px-6 pt-14 pb-10">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="font-mono text-[10px] tracking-[0.4em] text-ink-500 uppercase">
            backend-less · live from public rpc
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="mt-2 text-3xl font-light tracking-tight text-ink-50 md:text-5xl">
            Agent Economy <span className="text-ink-400">Observatory</span>
          </motion.h1>
        </div>
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="hidden gap-6 font-mono text-[11px] tracking-wider text-ink-500 uppercase md:flex">
          <a href="#marketplaces" className="hover:text-ink-100">Marketplaces</a>
          <a href="#registry" className="hover:text-ink-100">Registry</a>
          <a href="#payments" className="hover:text-ink-100">Payments</a>
        </motion.nav>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-24">
        <div id="marketplaces"><MarketplacesPanel /></div>
        <div id="payments"><PaymentsPanel /></div>
        <div id="registry"><RegistryLog /></div>
      </main>

      <footer className="border-t border-ink-800 px-6 py-6 text-center font-mono text-[10px] tracking-wider text-ink-600">
        data: base.org · drpc · publicnode · agenteconomy.to · onchainagentintel.io · facilitators.x402.watch — no backend, no keys
      </footer>
    </div>
  )
}
