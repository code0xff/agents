import { motion } from 'motion/react'
import { Panel } from '../../components/Panel'
import { useT } from '../../i18n'
import { compact } from '../../lib/format'
import type { Share } from './derive'

function Bars({ title, rows, unit, tag, source }: {
  title: string; rows: Share[]; unit: 'pct' | 'count'; tag: string; source?: string
}) {
  const { t } = useT()
  const max = rows[0]?.pct ?? 100
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase">{title}</h3>
        {source && <p className="font-mono text-[9px] leading-relaxed text-ink-400">{source}</p>}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const name = r.name === '__others__' ? t('ins.others') : r.name
          return (
            <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <div className="relative h-5 min-w-0">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-sm bg-ink-800"
                  initial={{ width: 0 }} animate={{ width: `${(r.pct / max) * 100}%` }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="relative z-10 flex h-full items-center truncate px-2 font-mono text-[11px] text-ink-200">
                  {name}
                </span>
              </div>
              <span className="font-mono text-[11px] text-ink-400 tabular-nums">
                {unit === 'pct' ? `${r.pct.toFixed(1)}%` : compact(r.value, tag)}
              </span>
            </li>
          )
        })}
        {rows.length === 0 && <li className="py-4 font-mono text-[11px] text-ink-500">{t('ins.noData')}</li>}
      </ul>
    </div>
  )
}

/** Each headline fact gets its own outline; run together they read as one sentence. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 rounded-md border border-ink-800 bg-ink-900/40 px-2 py-1">
      <span className="font-mono text-[9px] tracking-[0.16em] text-ink-500 uppercase">{label}</span>
      <span className="font-mono text-[11px] text-ink-100 tabular-nums">{value}</span>
    </span>
  )
}

export function Concentration({ facilitators, paymentChains, chains, usdcPct, mcpAgents, chainsAsOf }: {
  facilitators: Share[]; paymentChains: Share[]; chains: Share[]
  usdcPct?: number; mcpAgents?: number; chainsAsOf?: string
}) {
  const { t, tag } = useT()
  const chainSource = chainsAsOf
    ? `${t('src.asOf', { date: new Date(chainsAsOf).toLocaleDateString(tag, { month: 'short', day: 'numeric' }) })}`
    : undefined
  const topFac = facilitators.find((f) => f.name !== '__others__')
  const topChain = chains.find((c) => c.name !== '__others__')
  const facts = [
    topFac && { label: t('ins.topFacilitator'), value: `${topFac.name} ${topFac.pct.toFixed(1)}%` },
    topChain && { label: t('ins.topChainLabel'), value: `${topChain.name} ${topChain.pct.toFixed(1)}%` },
    usdcPct != null && { label: t('ins.usdcShare'), value: `${usdcPct.toFixed(1)}%` },
    mcpAgents != null && { label: t('mp.stat.endpointsSub'), value: compact(mcpAgents, tag) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Panel eyebrow={t('ins.eyebrow')} title={t('ins.title')} delay={0.05}>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-ink-800 px-4 py-3 sm:px-5">
          {facts.map((f) => <Fact key={f.label} label={f.label} value={f.value} />)}
        </div>
      )}
      <div className="grid divide-y divide-ink-800 md:grid-cols-3 md:divide-x md:divide-y-0">
        <Bars title={t('ins.facilitators')} rows={facilitators} unit="pct" tag={tag} />
        {/* Which chains the headline payment total is actually made of. Published on a slower
            schedule than the totals, so it states its own date. */}
        <Bars title={t('ins.paymentChains')} rows={paymentChains} unit="pct" tag={tag} source={chainSource} />
        <Bars title={t('ins.agentChains')} rows={chains} unit="count" tag={tag} />
      </div>
    </Panel>
  )
}
