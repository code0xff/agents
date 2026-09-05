import { motion } from 'motion/react'
import { Panel } from '../../components/Panel'
import { useT } from '../../i18n'
import { compact } from '../../lib/format'
import type { Share } from './derive'

function Bars({ title, rows, unit, tag }: { title: string; rows: Share[]; unit: 'pct' | 'count'; tag: string }) {
  const { t } = useT()
  const max = rows[0]?.pct ?? 100
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
      <h3 className="font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase">{title}</h3>
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
        {rows.length === 0 && <li className="py-4 font-mono text-[11px] text-ink-600">{t('ins.noData')}</li>}
      </ul>
    </div>
  )
}

export function Concentration({ facilitators, chains, usdcPct, mcpAgents }: {
  facilitators: Share[]; chains: Share[]; usdcPct?: number; mcpAgents?: number
}) {
  const { t, tag } = useT()
  const topFac = facilitators.find((f) => f.name !== '__others__')
  const topChain = chains.find((c) => c.name !== '__others__')
  return (
    <Panel eyebrow={t('ins.eyebrow')} title={t('ins.title')} delay={0.05}
      right={<div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-ink-500">
        {topFac && <span>{t('ins.topShare', { name: topFac.name, pct: topFac.pct.toFixed(0) })}</span>}
        {topChain && <span>{t('ins.topChain', { name: topChain.name, pct: topChain.pct.toFixed(0) })}</span>}
        {usdcPct != null && <span>{t('ins.usdc')} {usdcPct.toFixed(1)}%</span>}
        {mcpAgents != null && <span>{compact(mcpAgents, tag)} {t('mp.stat.endpointsSub')}</span>}
      </div>}>
      <div className="grid divide-y divide-ink-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        <Bars title={t('ins.facilitators')} rows={facilitators} unit="pct" tag={tag} />
        <Bars title={t('ins.agentChains')} rows={chains} unit="count" tag={tag} />
      </div>
    </Panel>
  )
}
