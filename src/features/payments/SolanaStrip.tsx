import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useT } from '../../i18n'
import { compact } from '../../lib/format'
import { useAgentEconomy, useSnapshot } from '../marketplaces/useAggregates'
import { useSolanaPulse } from './useSolanaPulse'

/**
 * Solana is read differently from Base and Polygon, so it gets its own block rather than a place
 * in the chain selector or the flow graph. Putting it beside them would promise a completeness it
 * cannot deliver. See docs/research/solana-payments.md.
 */
export function SolanaStrip() {
  const { t, tag } = useT()
  const pulse = useSolanaPulse()
  const ae = useAgentEconomy()
  const cdp = useSnapshot('bazaar-cdp')
  const payai = useSnapshot('bazaar-payai')

  const solanaShare = useMemo(() => {
    const chains = ae.data?.x402.chains
    if (!chains?.length) return null
    const total = chains.reduce((a, c) => a + c.txs, 0)
    const sol = chains.find((c) => c.name.toLowerCase() === 'solana')
    return sol && total ? { pct: (sol.txs / total) * 100, txs: sol.txs } : null
  }, [ae.data])

  const services = useMemo(() => {
    const count = (nets: Record<string, number> | undefined) =>
      Object.entries(nets ?? {}).filter(([k]) => k.toLowerCase().startsWith('solana')).reduce((a, [, v]) => a + v, 0)
    const n = count(cdp.data?.networks) + count(payai.data?.networks)
    return n > 0 ? n : null
  }, [cdp.data, payai.data])

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl border border-ink-800 bg-panel backdrop-blur-md"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink-800 px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{t('sol.eyebrow')}</p>
          <h2 className="text-[13px] font-medium tracking-[0.02em] text-ink-100">{t('sol.title')}</h2>
        </div>
        {pulse.sources.length > 0 && (
          <span className="font-mono text-[10px] text-ink-500">
            {t(pulse.sources.length === 1 ? 'sol.sources' : 'sol.sourcesPlural', { n: pulse.sources.length })}
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 divide-x divide-y divide-ink-800 md:grid-cols-4 md:divide-y-0">
        <Cell label={t('sol.rate')}
          value={pulse.perMinute != null ? t('sig.perMin', { n: pulse.perMinute.toFixed(0) }) : null}
          empty={pulse.loading ? '…' : t('sol.none')} live />
        <Cell label={t('sol.share')} value={solanaShare ? `${solanaShare.pct.toFixed(1)}%` : null} />
        <Cell label={t('sol.cumulative')} value={solanaShare ? compact(solanaShare.txs, tag) : null} />
        <Cell label={t('sol.services')} value={services != null ? compact(services, tag) : null} />
      </div>

      <p className="px-4 py-3 font-mono text-[10px] leading-[1.7] text-ink-600 sm:px-5">{t('sol.note')}</p>
    </motion.section>
  )
}

function Cell({ label, value, empty, live = false }: { label: string; value: string | null; empty?: string; live?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:px-5">
      <span className="flex items-center gap-1.5 truncate font-mono text-[9px] tracking-[0.2em] text-ink-500 uppercase">
        {label}
        {live && value && <span className="h-1 w-1 shrink-0 animate-pulse rounded-full bg-ink-200" />}
      </span>
      <span className="truncate font-mono text-lg leading-none font-light text-ink-50 tabular-nums">
        {value ?? <span className="text-[11px] text-ink-700">{empty ?? '—'}</span>}
      </span>
    </div>
  )
}
