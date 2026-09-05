import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { Pagination, usePagination } from '../../components/Pagination'
import { Stat } from '../../components/Stat'
import { CHAINS, PAYMENT_CHAIN_KEYS, type PaymentChainKey } from '../../data/chains'
import { useT } from '../../i18n'
import { short, timeAgo, usd } from '../../lib/format'
import { useIsMobile } from '../../lib/useMediaQuery'
import { PaymentGraph } from './PaymentGraph'
import { facilitatorLabel, type PaymentsState } from './usePayments'

export function PaymentsPanel({ state }: { state: PaymentsState }) {
  const { t, tag } = useT()
  const isMobile = useIsMobile()
  const { payments: all, heads, blocksScanned, errors } = state
  const [chains, setChains] = useState<PaymentChainKey[]>(PAYMENT_CHAIN_KEYS)
  const payments = useMemo(() => all.filter((p) => chains.includes(p.chain)), [all, chains])
  const stats = useMemo(() => ({
    vol: payments.reduce((a, p) => a + p.usdc, 0),
    facs: new Set(payments.map((p) => p.facilitator)).size,
    n: payments.length,
  }), [payments])
  // Senders are counted per chain, so the key carries the chain it was seen on.
  const top = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of payments) { const k = `${p.chain}:${p.facilitator}`; c[k] = (c[k] ?? 0) + 1 }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [payments])
  const paged = usePagination(payments, isMobile ? 6 : 10)
  const find = (senderKey: string) => {
    const [chain, addr] = senderKey.split(':')
    return payments.find((x) => x.chain === chain && x.facilitator === addr)
  }

  return (
    <Panel eyebrow={t('pay.eyebrow')} title={t('pay.title')} delay={0.2}
      right={<div className="flex flex-wrap items-center gap-2">
        {PAYMENT_CHAIN_KEYS.map((c) => (
          <button key={c} aria-pressed={chains.includes(c)}
            onClick={() => setChains((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
            className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider transition ${chains.includes(c) ? 'border-ink-500 text-ink-100' : 'border-ink-800 text-ink-600'}`}
            title={errors[c] ?? (heads[c] ? `${t('common.block')} ${heads[c]}` : '')}>
            {CHAINS[c].short}{errors[c] ? ' !' : ''}
          </button>
        ))}
        <span className="font-mono text-[10px] text-ink-500">{blocksScanned} {t('common.scanned')}</span>
        <LiveDot active={Object.keys(heads).length > 0} />
      </div>}>
      <div className="grid grid-cols-3 divide-x divide-ink-800 border-b border-ink-800">
        <Stat label={t('pay.stat.count')} value={stats.n} />
        <Stat label={t('pay.stat.volume')} value={stats.vol} format={(n) => usd(n, 2, tag)} />
        <Stat label={t('pay.stat.facilitators')} value={stats.facs} />
      </div>
      <div className="grid md:grid-cols-[1fr_300px]">
        <div className="relative flex flex-col">
          <PaymentGraph payments={payments} compact={isMobile} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-800 px-4 py-2 font-mono text-[10px] text-ink-500">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-50" />{t('pay.legend.facilitator')}</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-300" />{t('pay.legend.service')}</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full border border-ink-400 bg-ink-600" />{t('pay.legend.payer')}</span>
            <span className="ml-auto hidden text-ink-600 sm:inline">{t('zoom.hint')}</span>
            <span className="ml-auto text-ink-600 sm:hidden">{t('zoom.hintTouch')}</span>
          </div>
          {Object.values(errors).find(Boolean) && (
            <p className="absolute top-2 right-4 left-4 truncate font-mono text-[10px] text-ink-400">
              {t('pay.rpcError', { message: Object.values(errors).find(Boolean)! })}
            </p>
          )}
        </div>
        <div className="border-t border-ink-800 md:border-t-0 md:border-l">
          <div className="border-b border-ink-800 px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{t('pay.topSenders')}</div>
          <ul className="border-b border-ink-800 px-4 py-2 font-mono text-[11px]">
            {top.length === 0 && <li className="py-2 text-ink-600">{t('pay.waiting')}</li>}
            {top.map(([senderKey, n]) => {
              const p = find(senderKey)
              const [chain, addr] = senderKey.split(':') as [PaymentChainKey, string]
              return (
                <li key={senderKey} className="flex items-center justify-between gap-2 py-0.5">
                  <a className="flex min-w-0 items-center gap-1.5 text-ink-300 hover:text-ink-50"
                    title={p?.facilitatorName ? undefined : t('pay.unlabeledHelp')}
                    href={`${CHAINS[chain].explorer}/address/${addr}`} target="_blank" rel="noreferrer">
                    <span className="shrink-0 text-[9px] text-ink-600">{CHAINS[chain].short}</span>
                    <span className="truncate">{p ? facilitatorLabel(p) : short(addr)}</span>
                  </a>
                  <span className="shrink-0 text-ink-500 tabular-nums">{n}</span>
                </li>
              )
            })}
          </ul>
          <div className="px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{t('pay.recent')}</div>
          <ul className="font-mono text-[11px]">
            {/* See RegistryLog: an exit animation here would double the row count on a
                page change until it finished. */}
            {paged.items.map((p) => {
                const named = p.facilitatorName != null
                return (
                  <motion.li key={p.key} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
                    className="border-t border-ink-800/60">
                    {/* Every row is a real settlement, so it opens on the explorer. */}
                    <a href={`${CHAINS[p.chain].explorer}/tx/${p.tx}`} target="_blank" rel="noreferrer noopener"
                      title={t('pay.viewTx')}
                      className="flex items-center gap-2 px-4 py-1.5 transition-colors hover:bg-ink-800/40">
                      <span className="w-6 shrink-0 text-ink-600">{timeAgo(p.ts)}</span>
                      <span className="shrink-0 text-[9px] text-ink-600">{CHAINS[p.chain].short}</span>
                      <span className="shrink-0 text-ink-100 tabular-nums">{usd(p.usdc, 4, tag)}</span>
                      <span className="hidden truncate text-ink-500 sm:inline md:hidden lg:inline">{short(p.payer, 3)}→{short(p.payTo, 3)}</span>
                      <span className="ml-auto">
                        <Badge dim={!named} title={named ? undefined : t('pay.unlabeledHelp')}>
                          {facilitatorLabel(p)}
                        </Badge>
                      </span>
                    </a>
                  </motion.li>
                )
              })}
          </ul>
          <Pagination paged={paged} compact />
        </div>
      </div>
    </Panel>
  )
}
