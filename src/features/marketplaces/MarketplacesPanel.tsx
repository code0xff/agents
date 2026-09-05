import { motion } from 'motion/react'
import { Badge, Panel } from '../../components/Panel'
import marketplaces from '../../data/marketplaces.json'
import { useT, type Translate } from '../../i18n'
import type { Key } from '../../i18n/en'
import { compact, timeAgo } from '../../lib/format'
import { Sparkline } from './Sparkline'
import { useAgentEconomy, useOcaiStats, useSnapshot } from './useAggregates'

type M = (typeof marketplaces)[number]
const uniqueBy = <T,>(a: T[], f: (t: T) => string) => {
  const seen = new Set<string>()
  return a.filter((x) => { const k = f(x); if (seen.has(k)) return false; seen.add(k); return true })
}

function Card({ m, i, ae, ocai, t, tag }: {
  m: M; i: number; ae?: ReturnType<typeof useAgentEconomy>['data']; ocai?: ReturnType<typeof useOcaiStats>['data']
  t: Translate; tag: string
}) {
  const snap = useSnapshot('snapshot' in m ? m.snapshot : undefined)
  let metric: { label: string; value: string; spark?: number[] } | null = null
  const added = (n: number | undefined) => t('mp.metric.added', { n: n ?? 0 })
  if (m.feed === 'snapshot' && snap.data) {
    const isAgents = m.id === 'agentscan'
    const total = isAgents && snap.data.stats ? snap.data.stats.total : snap.data.total
    metric = { label: `${t(isAgents ? 'mp.metric.agentsIndexed' : 'mp.metric.resources')} · ${added(snap.data.added24h)}`, value: compact(total, tag) }
  }
  if (m.id === 'erc8004' && ae) metric = { label: t('mp.metric.registered'), value: compact(ae.erc8004Registry.totalAgents, tag), spark: ae.erc8004Registry.daily.map((d) => d.agents) }
  if (m.id === 'virtuals' && ae) metric = { label: t('mp.metric.memos'), value: compact(ae.virtualsAcp.totalMemos, tag), spark: ae.virtualsAcp.daily.map((d) => d.memos) }
  if (m.id === 'olas' && ae) metric = { label: t('mp.metric.mechTx'), value: compact(ae.olas.totalTxs, tag), spark: ae.olas.weekly.map((d) => d.txs) }
  if (m.id === 'ocai' && ocai) metric = { label: t('mp.metric.probed'), value: compact(ocai.agents_indexed, tag) }
  if (m.id === 'cdp-bazaar' && !snap.data && ae) metric = { label: t('mp.metric.x402All'), value: compact(ae.x402.totalTxs, tag), spark: ae.x402.daily.map((d) => d.txs) }

  return (
    <motion.a
      href={m.url} target="_blank" rel="noreferrer"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group flex flex-col gap-3 border-b border-ink-800 p-4 transition-colors hover:bg-ink-800/30 sm:border-r sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-ink-50 group-hover:underline">{m.name}</h3>
          <p className="text-[11px] text-ink-500">{m.operator} · {t(`mp.kind.${m.kind}` as Key)}</p>
        </div>
        <Badge dim={m.feed === 'link'}>{t(`feed.${m.feed}` as Key)}</Badge>
      </div>
      <p className="text-xs leading-relaxed text-ink-400">{t(`mp.note.${m.id}` as Key)}</p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5">{m.chains.map((c) => <span key={c} className="font-mono text-[10px] text-ink-500">{c}</span>)}</div>
        {metric && (
          <div className="ml-auto flex items-center gap-3">
            {metric.spark && <Sparkline data={metric.spark} className="hidden sm:block" />}
            <div className="text-right">
              <div className="font-mono text-base text-ink-100 tabular-nums">{metric.value}</div>
              <div className="font-mono text-[9px] tracking-wider text-ink-500 uppercase">{metric.label}</div>
            </div>
          </div>
        )}
      </div>
      {m.feed === 'snapshot' && snap.data && snap.data.items.length > 0 && (
        <ul className="border-t border-ink-800 pt-2 font-mono text-[10px] text-ink-500">
          {uniqueBy(snap.data.items, (it) => it.name).slice(0, 3).map((it, k) => (
            <li key={k} className="truncate">+ {it.name}{it.network ? ` · ${it.network}` : ''}</li>
          ))}
          <li className="text-ink-600">{t('common.snapshot', { time: timeAgo(snap.data.generatedAt) })}</li>
        </ul>
      )}
    </motion.a>
  )
}

export function MarketplacesPanel() {
  const { t, tag } = useT()
  const ae = useAgentEconomy()
  const ocai = useOcaiStats()
  const d = ae.data
  const status = d ? t('common.aggregates', { time: timeAgo(d.updatedAt) })
    : ae.isError ? t('common.aggregatesFailed') : t('common.aggregatesLoading')
  return (
    <Panel eyebrow={t('mp.eyebrow')} title={t('mp.title')}
      right={<span className="font-mono text-[10px] text-ink-500">{status}</span>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {marketplaces.map((m, i) => <Card key={m.id} m={m} i={i} ae={d} ocai={ocai.data} t={t} tag={tag} />)}
      </div>
    </Panel>
  )
}
