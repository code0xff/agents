import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useT } from '../../i18n'
import { compact, usd } from '../../lib/format'
import { useAgentEconomy, useOcaiStats } from '../marketplaces/useAggregates'
import { agentChainShares, facilitatorShares, paymentChainShares, trend } from './derive'
import { Concentration } from './Concentration'
import { Signal } from './Signal'

export function OverviewPanel({ observedPerMin }: { observedPerMin: number | null }) {
  const { t, tag } = useT()
  const ae = useAgentEconomy()
  const ocai = useOcaiStats()
  const d = ae.data

  const paySeries = useMemo(() => d?.x402.daily.map((x) => x.txs) ?? [], [d])
  const agentSeries = useMemo(() => d?.erc8004Registry.daily.map((x) => x.agents) ?? [], [d])
  const payTrend = useMemo(() => trend(paySeries), [paySeries])
  const agentTrend = useMemo(() => trend(agentSeries), [agentSeries])
  const facs = useMemo(() => facilitatorShares(d), [d])
  const chains = useMemo(() => agentChainShares(d), [d])
  const payChains = useMemo(() => paymentChainShares(d), [d])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 divide-y divide-ink-800 overflow-hidden rounded-xl border border-ink-800 bg-panel backdrop-blur-md sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0"
      >
        <Signal label={t('mp.stat.payments')} value={d?.x402.totalTxs} format={(n) => compact(n, tag)}
          trend={payTrend} series={paySeries.slice(-30)} />
        <Signal label={t('mp.stat.volume')} value={d?.x402.totalVolume} format={(n) => usd(n, 0, tag)}
          sub={d ? t('mp.stat.facilitators', { n: d.x402.facilitatorsTracked }) : undefined} />
        <Signal label={t('mp.stat.agents')} value={d?.erc8004Registry.totalAgents} format={(n) => compact(n, tag)}
          trend={agentTrend} series={agentSeries.slice(-30)}
          sub={d ? t('mp.stat.chains', { n: d.erc8004Registry.chainsTracked }) : undefined} />
        <Signal label={t('sig.observed')} value={observedPerMin} live
          format={(n) => t('sig.perMin', { n: n.toFixed(1) })}
          sub={t('sig.observedSub')} />
      </motion.div>

      <Concentration facilitators={facs} paymentChains={payChains} chains={chains} usdcPct={d?.x402.tokenSplit?.usdcSharePct}
        mcpAgents={ocai.data?.mcp_agents} />
    </div>
  )
}
