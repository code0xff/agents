import { motion } from 'motion/react'
import { Badge, Panel } from '../../components/Panel'
import { Stat } from '../../components/Stat'
import marketplaces from '../../data/marketplaces.json'
import { compact, timeAgo, usd } from '../../lib/format'
import { Sparkline } from './Sparkline'
import { useAgentEconomy, useOcaiStats, useSnapshot } from './useAggregates'

type M = (typeof marketplaces)[number]
const uniqueBy = <T,>(a: T[], f: (t: T) => string) => { const s = new Set<string>(); return a.filter((x) => { const k = f(x); if (s.has(k)) return false; s.add(k); return true }) }

function Card({ m, i, ae, ocai }: { m: M; i: number; ae?: ReturnType<typeof useAgentEconomy>['data']; ocai?: ReturnType<typeof useOcaiStats>['data'] }) {
  const snap = useSnapshot(m.snapshot)
  let metric: { label: string; value: string; spark?: number[] } | null = null
  if (m.feed === 'snapshot' && snap.data) metric = { label: `${m.id === 'agentscan' ? 'agents indexed' : 'resources'} · +${snap.data.added24h ?? 0} 24h`, value: compact(m.id === 'agentscan' && snap.data.stats ? snap.data.stats.total : snap.data.total) }
  if (m.id === 'erc8004' && ae) metric = { label: 'agents registered', value: compact(ae.erc8004Registry.totalAgents), spark: ae.erc8004Registry.daily.map((d) => d.agents) }
  if (m.id === 'virtuals' && ae) metric = { label: 'ACP memos', value: compact(ae.virtualsAcp.totalMemos), spark: ae.virtualsAcp.daily.map((d) => d.memos) }
  if (m.id === 'olas' && ae) metric = { label: 'mech transactions', value: compact(ae.olas.totalTxs), spark: ae.olas.weekly.map((d) => d.txs) }
  if (m.id === 'ocai' && ocai) metric = { label: 'agents probed', value: compact(ocai.agents_indexed) }
  if (m.id === 'cdp-bazaar' && !snap.data && ae) metric = { label: 'x402 payments (all facilitators)', value: compact(ae.x402.totalTxs), spark: ae.x402.daily.map((d) => d.txs) }

  return (
    <motion.a
      href={m.url} target="_blank" rel="noreferrer"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group flex flex-col gap-3 border-b border-r border-ink-800 p-5 transition-colors hover:bg-ink-800/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-ink-50 group-hover:underline">{m.name}</h3>
          <p className="text-[11px] text-ink-500">{m.operator} · {m.kind}</p>
        </div>
        <Badge dim={m.feed === 'link'}>{m.feed}</Badge>
      </div>
      <p className="text-xs leading-relaxed text-ink-400">{m.note}</p>
      <div className="mt-auto flex items-end justify-between">
        <div className="flex flex-wrap gap-1">{m.chains.map((c) => <span key={c} className="font-mono text-[10px] text-ink-500">{c}</span>)}</div>
        {metric && (
          <div className="flex items-center gap-3">
            {metric.spark && <Sparkline data={metric.spark} />}
            <div className="text-right">
              <div className="font-mono text-base text-ink-100 tabular-nums">{metric.value}</div>
              <div className="font-mono text-[9px] tracking-wider text-ink-500 uppercase">{metric.label}</div>
            </div>
          </div>
        )}
      </div>
      {m.feed === 'snapshot' && snap.data && snap.data.items.length > 0 && (
        <ul className="border-t border-ink-800 pt-2 font-mono text-[10px] text-ink-500">
          {uniqueBy(snap.data.items, (i) => i.name).slice(0, 3).map((it, k) => <li key={k} className="truncate">+ {it.name}{it.network ? ` · ${it.network}` : ''}</li>)}
          <li className="text-ink-600">snapshot {timeAgo(snap.data.generatedAt)} ago</li>
        </ul>
      )}
    </motion.a>
  )
}

export function MarketplacesPanel() {
  const ae = useAgentEconomy()
  const ocai = useOcaiStats()
  const d = ae.data
  return (
    <Panel eyebrow="Discovery" title="Agent marketplaces & registries"
      right={<span className="font-mono text-[10px] text-ink-500">{d ? `aggregates ${timeAgo(d.updatedAt)} ago` : ae.isError ? 'aggregates unavailable' : 'loading aggregates…'}</span>}>
      <div className="grid grid-cols-2 divide-x divide-ink-800 border-b border-ink-800 md:grid-cols-4">
        <Stat label="x402 payments · all time" value={d?.x402.totalTxs} format={compact} sub={d ? `${d.x402.facilitatorsTracked} facilitators` : undefined} />
        <Stat label="x402 volume" value={d?.x402.totalVolume} format={(n) => usd(n, 0)} />
        <Stat label="ERC-8004 agents" value={d?.erc8004Registry.totalAgents} format={compact} sub={d ? `${d.erc8004Registry.chainsTracked} chains` : undefined} />
        <Stat label="agents with live endpoints" value={ocai.data?.mcp_agents} sub="MCP reachable (OCAI)" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {marketplaces.map((m, i) => <Card key={m.id} m={m} i={i} ae={d} ocai={ocai.data} />)}
      </div>
    </Panel>
  )
}
