import * as d3 from 'd3'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Panel } from '../../components/Panel'
import { useT } from '../../i18n'
import type { Key } from '../../i18n/en'
import { compact, num, usd } from '../../lib/format'
import type { Market } from './useMarket'

// Monotone charts: one series each, so identity never rests on colour. Marks use the ink
// scale only, axes and grid stay recessive, every mark has a hover readout.

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Hover readout pinned inside the chart box, flipped to stay on screen. */
function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = x > w * 0.6
  return (
    <div className="pointer-events-none absolute z-10 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-ink-100 shadow-[0_8px_24px_-12px_rgb(0_0_0/.35)]"
      style={{ left: left ? undefined : x + 12, right: left ? w - x + 12 : undefined, top: Math.max(0, y - 12) }}>
      {children}
    </div>
  )
}

const axis = 'font-mono text-[10px] fill-[var(--ink-400)]'

/** Cumulative share of calls held by the top N sellers, rank on a log axis. */
export function ConcentrationCurve({ m }: { m: Market }) {
  const { t, tag } = useT()
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pts = m.curve
  const H = 220, P = { t: 12, r: 16, b: 28, l: 40 }
  if (pts.length < 2) return null
  const x = d3.scaleLog([1, pts[pts.length - 1].rank], [P.l, Math.max(P.l + 1, w - P.r)])
  const y = d3.scaleLinear([0, 1], [H - P.b, P.t])
  const line = d3.line<{ rank: number; share: number }>().x((d) => x(d.rank)).y((d) => y(d.share)).curve(d3.curveMonotoneX)
  const area = d3.area<{ rank: number; share: number }>().x((d) => x(d.rank)).y0(y(0)).y1((d) => y(d.share)).curve(d3.curveMonotoneX)
  const ticks = [1, 10, 100, 1000].filter((v) => v <= pts[pts.length - 1].rank)
  const h = hover != null ? pts[hover] : null
  const ten = pts.find((p) => p.rank === 10)

  return (
    <Panel title={t('bz.curve')} eyebrow={t('bz.curveEyebrow')}>
      <div className="px-4 pt-3 pb-4 sm:px-5">
        {ten && <p className="mb-2 text-[12px] text-ink-300">{t('bz.curveLead', { pct: (ten.share * 100).toFixed(0), n: num(m.totals.sellers, tag) })}</p>}
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
          {w > 0 && (
            <svg width={w} height={H} role="img" aria-label={t('bz.curve')}>
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={P.l} x2={w - P.r} y1={y(v)} y2={y(v)} stroke="var(--ink-800)" />
                  <text x={P.l - 6} y={y(v)} dy="0.32em" textAnchor="end" className={axis}>{v * 100}%</text>
                </g>
              ))}
              <line x1={P.l} x2={w - P.r} y1={y(0)} y2={y(0)} stroke="var(--ink-700)" />
              {ticks.map((v) => <text key={v} x={x(v)} y={H - 10} textAnchor="middle" className={axis}>{compact(v, tag)}</text>)}
              <path d={area(pts) ?? ''} fill="var(--ink-800)" opacity={0.6} />
              <motion.path d={line(pts) ?? ''} fill="none" stroke="var(--ink-100)" strokeWidth={2}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
              {h && <line x1={x(h.rank)} x2={x(h.rank)} y1={P.t} y2={y(0)} stroke="var(--ink-500)" strokeDasharray="2 3" />}
              {pts.map((p, i) => (
                <g key={p.rank}>
                  <circle cx={x(p.rank)} cy={y(p.share)} r={hover === i ? 5 : 3.5} fill="var(--ink-100)" stroke="var(--ink-900)" strokeWidth={2} />
                  {/* Hit target wider than the mark. */}
                  <rect x={x(p.rank) - 14} y={P.t} width={28} height={H - P.t - P.b} fill="transparent"
                    onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
                </g>
              ))}
            </svg>
          )}
          {h && <Tip x={x(h.rank)} y={y(h.share)} w={w}>{t('bz.curveTip', { n: num(h.rank, tag), pct: (h.share * 100).toFixed(1) })}</Tip>}
        </div>
        <p className="mt-1 font-mono text-[10px] text-ink-400">{t('bz.curveAxis')}</p>
      </div>
    </Panel>
  )
}

/** Endpoints per order of magnitude of 30-day calls, with the calls each band carries. */
export function DemandTail({ m }: { m: Market }) {
  const { t, tag } = useT()
  const rows = m.demand
  const total = m.totals.calls30d || 1
  const maxEp = d3.max(rows, (r) => r.endpoints) || 1
  if (!rows.length) return null
  return (
    <Panel title={t('bz.tail')} eyebrow={t('bz.tailEyebrow')}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 font-mono text-[10px] tracking-[.035em] text-ink-400 uppercase">
          <span>{t('bz.tailCalls')}</span><span>{t('bz.legend.endpoints')}</span><span>{t('bz.tailShare')}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const share = r.calls / total
            return (
              <li key={r.key} title={t('bz.tailTip', { n: num(r.endpoints, tag), pct: (share * 100).toFixed(1) })}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3">
                <span className="font-mono text-[11px] text-ink-200">{t(`bz.tail.${r.key}` as Key)}</span>
                <TailBar pct={(r.endpoints / maxEp) * 100} label={compact(r.endpoints, tag)} tone="bg-ink-500" delay={i * 0.05} />
                <TailBar pct={share * 100} label={`${(share * 100).toFixed(1)}%`} tone="bg-ink-200" delay={i * 0.05 + 0.03} />
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] leading-relaxed text-ink-400">{t('bz.tailNote')}</p>
      </div>
    </Panel>
  )
}

function TailBar({ pct, label, tone, delay }: { pct: number; label: string; tone: string; delay: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-ink-800/60">
        <motion.div className={`absolute inset-y-0 left-0 origin-left rounded-sm ${tone}`} style={{ width: `${Math.max(pct, 0.5)}%` }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ink-300 tabular-nums">{label}</span>
    </div>
  )
}

/** Top sellers placed by median price (x) and reported calls (y), both log; size is endpoint count. */
export function PriceDemandScatter({ m }: { m: Market }) {
  const { t, tag } = useT()
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)
  const pts = m.sellers.filter((s) => s.medianUsd != null && s.medianUsd > 0 && s.calls > 0)
  const H = 280, P = { t: 12, r: 16, b: 30, l: 44 }
  if (pts.length < 3) return null
  const x = d3.scaleLog(d3.extent(pts, (s) => s.medianUsd!) as [number, number], [P.l, Math.max(P.l + 1, w - P.r)]).nice()
  const y = d3.scaleLog(d3.extent(pts, (s) => s.calls) as [number, number], [H - P.b, P.t]).nice()
  const r = d3.scaleSqrt([0, d3.max(pts, (s) => s.endpoints) || 1], [4, 14])
  const xt = x.ticks().filter((v) => [1, 3].includes(+v.toExponential()[0]) || x.ticks().length < 6)
  const yt = y.ticks().filter((v) => +v.toExponential()[0] === 1)
  const h = pts.find((s) => s.host === hover)
  // Draw large bubbles first so small ones stay on top and reachable.
  const ordered = [...pts].sort((a, b) => b.endpoints - a.endpoints)

  return (
    <Panel title={t('bz.scatter')} eyebrow={t('bz.scatterEyebrow', { n: pts.length })}>
      <div className="px-4 pt-3 pb-4 sm:px-5">
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
          {w > 0 && (
            <svg width={w} height={H} role="img" aria-label={t('bz.scatter')}>
              {yt.map((v) => (
                <g key={v}>
                  <line x1={P.l} x2={w - P.r} y1={y(v)} y2={y(v)} stroke="var(--ink-800)" />
                  <text x={P.l - 6} y={y(v)} dy="0.32em" textAnchor="end" className={axis}>{compact(v, tag)}</text>
                </g>
              ))}
              {xt.map((v) => (
                <g key={v}>
                  <line x1={x(v)} x2={x(v)} y1={P.t} y2={H - P.b} stroke="var(--ink-800)" />
                  <text x={x(v)} y={H - 12} textAnchor="middle" className={axis}>{usd(v, v < 0.01 ? 4 : 2, tag)}</text>
                </g>
              ))}
              {ordered.map((s, i) => (
                <motion.circle key={s.host} cx={x(s.medianUsd!)} cy={y(s.calls)} r={r(s.endpoints)}
                  fill={hover === s.host ? 'var(--ink-50)' : 'var(--ink-300)'} fillOpacity={hover && hover !== s.host ? 0.35 : 0.75}
                  stroke="var(--ink-900)" strokeWidth={2}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: Math.min(i * 0.008, 0.6) }}
                  onMouseEnter={() => setHover(s.host)} onTouchStart={() => setHover(s.host)} />
              ))}
            </svg>
          )}
          {h && (
            <Tip x={x(h.medianUsd!)} y={y(h.calls)} w={w}>
              <div className="text-ink-50">{h.host}</div>
              <div className="text-ink-400">{t('bz.scatterTip', { calls: compact(h.calls, tag), price: usd(h.medianUsd!, h.medianUsd! < 0.01 ? 4 : 3, tag), n: num(h.endpoints, tag) })}</div>
            </Tip>
          )}
        </div>
        <p className="mt-1 font-mono text-[10px] text-ink-400">{t('bz.scatterAxis')}</p>
      </div>
    </Panel>
  )
}
