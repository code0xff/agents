import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { Stat } from '../../components/Stat'
import { useT } from '../../i18n'
import { short, timeAgo, usd } from '../../lib/format'
import { PaymentGraph } from './PaymentGraph'
import { facilitatorLabel, usePayments } from './usePayments'

export function PaymentsPanel() {
  const { t, tag } = useT()
  const { payments, head, blocksScanned, error, senderCounts } = usePayments()
  const stats = useMemo(() => ({
    vol: payments.reduce((a, p) => a + p.usdc, 0),
    facs: new Set(payments.map((p) => p.facilitator)).size,
    n: payments.length,
  }), [payments])
  const top = useMemo(() => Object.entries(senderCounts).sort((a, b) => b[1] - a[1]).slice(0, 6), [senderCounts])
  const label = (addr: string) => {
    const p = payments.find((x) => x.facilitator === addr)
    return (p && facilitatorLabel(p, senderCounts, t)) ?? short(addr)
  }

  return (
    <Panel eyebrow={t('pay.eyebrow')} title={t('pay.title')} delay={0.2}
      right={<div className="flex items-center gap-3 font-mono text-[10px] text-ink-500">
        <span>{head ? `${t('common.block')} ${head}` : '—'}</span>
        <span>{blocksScanned} {t('common.scanned')}</span>
        <LiveDot active={!!head} />
      </div>}>
      <div className="grid grid-cols-3 divide-x divide-ink-800 border-b border-ink-800">
        <Stat label={t('pay.stat.count')} value={stats.n} />
        <Stat label={t('pay.stat.volume')} value={stats.vol} format={(n) => usd(n, 2, tag)} />
        <Stat label={t('pay.stat.facilitators')} value={stats.facs} />
      </div>
      <div className="grid md:grid-cols-[1fr_300px]">
        <div className="relative">
          <PaymentGraph payments={payments} counts={senderCounts} t={t} />
          <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap gap-4 font-mono text-[10px] text-ink-500">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-50" />{t('pay.legend.facilitator')}</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-300" />{t('pay.legend.service')}</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full border border-ink-400 bg-ink-600" />{t('pay.legend.payer')}</span>
          </div>
          {error && <p className="absolute top-3 left-4 font-mono text-[10px] text-ink-400">{t('pay.rpcError', { message: error })}</p>}
        </div>
        <div className="border-t border-ink-800 md:border-t-0 md:border-l">
          <div className="border-b border-ink-800 px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{t('pay.topSenders')}</div>
          <ul className="border-b border-ink-800 px-4 py-2 font-mono text-[11px]">
            {top.length === 0 && <li className="py-2 text-ink-600">{t('pay.waiting')}</li>}
            {top.map(([addr, n]) => (
              <li key={addr} className="flex justify-between gap-2 py-0.5">
                <a className="truncate text-ink-300 hover:text-ink-50" href={`https://basescan.org/address/${addr}`} target="_blank" rel="noreferrer">{label(addr)}</a>
                <span className="text-ink-500 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{t('pay.recent')}</div>
          <ul className="max-h-[260px] overflow-y-auto font-mono text-[11px]">
            <AnimatePresence initial={false}>
              {payments.slice(0, 30).map((p) => {
                const fl = facilitatorLabel(p, senderCounts, t)
                return (
                  <motion.li key={p.key} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 border-t border-ink-800/60 px-4 py-1.5">
                    <span className="w-6 text-ink-600">{timeAgo(p.ts)}</span>
                    <span className="text-ink-100 tabular-nums">{usd(p.usdc, 4, tag)}</span>
                    <span className="truncate text-ink-500">{short(p.payer, 3)}→{short(p.payTo, 3)}</span>
                    <span className="ml-auto shrink-0">{fl ? <Badge>{fl}</Badge> : <Badge dim>{short(p.facilitator, 3)}</Badge>}</span>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </Panel>
  )
}
