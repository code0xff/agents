import { motion } from 'motion/react'
import { Pagination, usePagination } from '../../components/Pagination'
import { Badge, Panel } from '../../components/Panel'
import { Stat } from '../../components/Stat'
import { useT } from '../../i18n'
import type { Key } from '../../i18n/en'
import { compact, num, timeAgo, usd } from '../../lib/format'
import { useIsMobile } from '../../lib/useMediaQuery'
import { Sparkline } from '../marketplaces/Sparkline'
import { ConcentrationCurve, DemandTail, PriceDemandScatter } from './Charts'
import { BAND_KEYS, useMarket, type Market } from './useMarket'

const price = (v: number | null, tag: string) => (v == null ? '—' : v === 0 ? usd(0, 0, tag) : usd(v, v < 0.01 ? 4 : 3, tag))
const pathOf = (url: string) => { try { const u = new URL(url); return u.pathname } catch { return url } }

/**
 * CDP Bazaar read as a market. Everything here is computed in CI from the full catalog
 * (scripts/bazaar-market.mjs); the page only renders the aggregates.
 */
export function BazaarPanel() {
  const { t, tag } = useT()
  const q = useMarket()

  if (q.isLoading) return <Panel title={t('bz.title')} eyebrow={t('bz.eyebrow')}><p className="px-5 py-10 font-mono text-[11px] text-ink-400">{t('common.aggregatesLoading')}</p></Panel>
  const m = q.data
  if (!m || m.totals.endpoints === 0) return <Panel title={t('bz.title')} eyebrow={t('bz.eyebrow')}><p className="px-5 py-10 font-mono text-[11px] text-ink-400">{t('bz.empty')}</p></Panel>

  const T = m.totals
  return (
    <>
      <Panel title={t('bz.title')} eyebrow={t('bz.eyebrow')}
        right={<span className="font-mono text-[11px] text-ink-400">{t('common.snapshot', { time: timeAgo(m.generatedAt) })}</span>}>
        <div className="grid grid-cols-2 divide-ink-800 lg:grid-cols-4 [&>*]:border-ink-800 [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-l lg:[&>*:nth-child(n+2)]:border-l">
          <Stat label={t('bz.stat.endpoints')} value={T.endpoints} format={(v) => compact(v, tag)} sub={t('bz.stat.endpointsSub', { n: num(T.reported, tag) })} />
          <Stat label={t('bz.stat.sellers')} value={T.sellers} sub={t('bz.stat.sellersSub')} />
          <Stat label={t('bz.stat.calls')} value={T.calls30d} format={(v) => compact(v, tag)} sub={t('bz.stat.callsSub')} />
          <Stat label={t('bz.stat.median')} value={T.medianUsd} format={(v) => price(v, tag)} sub={t('bz.stat.medianSub', { n: compact(T.priced, tag) })} />
        </div>
        {T.top10Share != null && (
          <p className="border-t border-ink-800 px-4 py-3 text-[12px] text-ink-400 sm:px-5">
            {t('bz.concentration', { pct: (T.top10Share * 100).toFixed(0) })}
          </p>
        )}
      </Panel>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ConcentrationCurve m={m} />
        <DemandTail m={m} />
      </div>

      {/* Three columns of similar height; stacking two splits beside the price bars left a gap. */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        <PriceDemand m={m} />
        <Split title={t('bz.networks')} note={t('bz.networksNote')}
          rows={m.networks.slice(0, 8).map((r) => ({ name: r.label, value: r.endpoints }))} />
        <div className="md:col-span-2 xl:col-span-1">
          <Split title={t('bz.categories')} note={t('bz.categoriesNote')}
            rows={m.categories.map((r) => ({ name: t(`bz.cat.${r.key}` as Key), value: r.calls }))} />
        </div>
      </div>

      <PriceDemandScatter m={m} />
      <Sellers m={m} />
      <TopEndpoints m={m} />
      <Trend m={m} />

      <Panel title={t('bz.caveats')} eyebrow={t('bz.caveatsEyebrow')}>
        <ul className="flex list-disc flex-col gap-1.5 py-4 pr-5 pl-9 text-[12px] leading-relaxed text-ink-400">
          {(['listed', 'calls', 'payers', 'usdc', 'host', 'neutral'] as const).map((k) => <li key={k}>{t(`bz.note.${k}` as Key)}</li>)}
        </ul>
      </Panel>
    </>
  )
}

/** Share of endpoints against share of reported calls, per price band: where supply and demand diverge. */
function PriceDemand({ m }: { m: Market }) {
  const { t } = useT()
  const ep = m.totals.endpoints || 1, calls = m.totals.calls30d || 1
  const rows = BAND_KEYS.filter((k) => m.bands[k].endpoints > 0)
  return (
    <Panel title={t('bz.price')} eyebrow={t('bz.priceEyebrow')} className="h-full">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <div className="flex gap-4 font-mono text-[10px] tracking-[.035em] text-ink-400 uppercase">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 rounded-sm bg-ink-500" />{t('bz.legend.endpoints')}</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 rounded-sm bg-ink-200" />{t('bz.legend.calls')}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {rows.map((k, i) => {
            const b = m.bands[k], a = (b.endpoints / ep) * 100, c = (b.calls / calls) * 100
            return (
              <li key={k} className="grid grid-cols-[4.75rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1">
                <span className="row-span-2 font-mono text-[11px] text-ink-200">{t(`bz.band.${k}` as Key)}</span>
                <Bar pct={a} tone="bg-ink-500" delay={i * 0.05} />
                <span className="text-right font-mono text-[11px] text-ink-400 tabular-nums">{a.toFixed(1)}%</span>
                <Bar pct={c} tone="bg-ink-200" delay={i * 0.05 + 0.03} />
                <span className="text-right font-mono text-[11px] text-ink-100 tabular-nums">{c.toFixed(1)}%</span>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] leading-relaxed text-ink-400">{t('bz.priceNote')}</p>
      </div>
    </Panel>
  )
}

function Bar({ pct, tone, delay }: { pct: number; tone: string; delay: number }) {
  return (
    <div className="relative h-2 overflow-hidden rounded-sm bg-ink-800/60">
      {/* Width is set outright; only the scale animates. */}
      <motion.div className={`absolute inset-y-0 left-0 origin-left rounded-sm ${tone}`} style={{ width: `${pct}%` }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}

function Split({ title, note, rows }: { title: string; note: string; rows: { name: string; value: number }[] }) {
  const { tag } = useT()
  const max = rows[0]?.value || 1
  return (
    <Panel title={title} className="h-full">
      <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <div className="relative h-5 min-w-0">
                <div className="absolute inset-y-0 left-0 rounded-sm bg-ink-800" style={{ width: `${(r.value / max) * 100}%` }} />
                <span className="relative z-10 flex h-full items-center truncate px-2 font-mono text-[11px] text-ink-200">{r.name}</span>
              </div>
              <span className="font-mono text-[11px] text-ink-400 tabular-nums">{compact(r.value, tag)}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-ink-400">{note}</p>
      </div>
    </Panel>
  )
}

const th = 'px-4 py-2 text-left font-mono text-[10px] font-normal tracking-[.035em] text-ink-400 uppercase sm:px-5'

function Sellers({ m }: { m: Market }) {
  const { t, tag } = useT()
  const paged = usePagination(m.sellers, useIsMobile() ? 6 : 10)
  return (
    <Panel title={t('bz.sellers')} eyebrow={t('bz.sellersEyebrow', { n: m.sellers.length })}>
      <table className="w-full table-fixed border-collapse max-sm:block">
        <thead className="max-sm:hidden"><tr className="border-b border-ink-800">
          <th className={`${th} w-[34%]`}>{t('bz.col.host')}</th><th className={`${th} text-right`}>{t('bz.col.endpoints')}</th>
          <th className={`${th} text-right`}>{t('bz.col.calls')}</th><th className={`${th} text-right`}>{t('bz.col.maxPayers')}</th>
          <th className={`${th} text-right`}>{t('bz.col.median')}</th><th className={th}>{t('bz.col.networks')}</th>
        </tr></thead>
        <tbody className="font-mono text-[12px] max-sm:block">
          {paged.items.map((s, i) => (
            <tr key={s.host} className="border-b border-ink-800/60 last:border-0 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-0.5 max-sm:px-4 max-sm:py-2.5">
              <td className="truncate px-4 py-2 text-ink-100 max-sm:col-span-2 max-sm:p-0 sm:px-5">
                <span className="mr-2 text-ink-500 tabular-nums">{paged.from + i}</span>{s.host}
              </td>
              <Cell label={t('bz.col.endpoints')}>{num(s.endpoints, tag)}</Cell>
              <Cell label={t('bz.col.calls')} strong>{compact(s.calls, tag)}</Cell>
              <Cell label={t('bz.col.maxPayers')}>{s.maxPayers ? num(s.maxPayers, tag) : '—'}</Cell>
              <Cell label={t('bz.col.median')}>{price(s.medianUsd, tag)}</Cell>
              <td className="truncate px-4 py-2 text-[11px] text-ink-400 max-sm:col-span-2 max-sm:p-0 sm:px-5">{s.networks.join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination paged={paged} />
    </Panel>
  )
}

/** Desktop: a right-aligned number cell. Mobile: a labelled pair in a two-column grid. */
function Cell({ label, children, strong = false }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <td className={`px-4 py-2 text-right tabular-nums max-sm:flex max-sm:justify-between max-sm:p-0 max-sm:text-[11px] sm:px-5 ${strong ? 'text-ink-100' : 'text-ink-300'}`}>
      <span className="font-mono text-[10px] text-ink-500 uppercase sm:hidden">{label}</span>{children}
    </td>
  )
}

function TopEndpoints({ m }: { m: Market }) {
  const { t, tag } = useT()
  const paged = usePagination(m.topEndpoints, useIsMobile() ? 6 : 10)
  return (
    <Panel title={t('bz.endpoints')} eyebrow={t('bz.endpointsEyebrow', { n: m.topEndpoints.length })}>
      <ul className="font-mono text-[12px]">
        {paged.items.map((e) => (
          <li key={`${e.method} ${e.resource}`} className="border-b border-ink-800/60 last:border-0">
            <a href={e.resource} target="_blank" rel="noreferrer noopener" className="flex flex-col gap-1 px-4 py-2.5 transition-colors hover:bg-ink-800/40 sm:px-5">
              <span className="flex items-center gap-2">
                <Badge dim>{e.method}</Badge>
                <span className="min-w-0 truncate text-ink-100">{e.name ?? e.host}</span>
                <span className="ml-auto shrink-0 text-ink-100 tabular-nums">{t('bz.callsN', { n: compact(e.calls, tag) })}</span>
              </span>
              <span className="flex items-center gap-3 text-[11px] text-ink-400">
                <span className="min-w-0 truncate">{e.host}{pathOf(e.resource)}</span>
                <span className="ml-auto shrink-0 tabular-nums">{price(e.usd, tag)}</span>
                {e.payers != null && <span className="shrink-0 tabular-nums">{t('bz.payersN', { n: num(e.payers, tag) })}</span>}
                {e.lastCalledAt && <span className="hidden shrink-0 text-ink-500 sm:inline">{timeAgo(e.lastCalledAt)}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Pagination paged={paged} />
    </Panel>
  )
}

function Trend({ m }: { m: Market }) {
  const { t, tag } = useT()
  const h = m.history
  return (
    <Panel title={t('bz.trend')} eyebrow={t('bz.trendEyebrow')}>
      {h.length < 2 ? (
        <p className="px-4 py-6 text-[12px] text-ink-400 sm:px-5">{t('bz.trendEmpty', { date: h[0]?.date ?? '—' })}</p>
      ) : (
        <div className="grid gap-px bg-ink-800 sm:grid-cols-2">
          {([['endpoints', 'bz.stat.endpoints'], ['calls30d', 'bz.stat.calls']] as const).map(([k, label]) => (
            <div key={k} className="flex items-end justify-between gap-4 bg-ink-900 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[.035em] text-ink-400 uppercase">{t(label)}</span>
                <span className="font-mono text-lg text-ink-50 tabular-nums">{compact(h[h.length - 1][k], tag)}</span>
                <span className="font-mono text-[10px] text-ink-500">{h[0].date} – {h[h.length - 1].date}</span>
              </div>
              <Sparkline data={h.map((r) => r[k])} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
