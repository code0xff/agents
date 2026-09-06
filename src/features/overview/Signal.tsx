import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import * as d3 from 'd3'
import { useT } from '../../i18n'
import { num } from '../../lib/format'
import type { Trend } from './derive'

/** A headline number with its 7-day momentum and a shape for the series behind it. */
export function Signal({ label, value, format, trend, trendLabel, series, live = false, sub }: {
  label: string
  value: number | null | undefined
  format?: (n: number) => string
  trend?: Trend | null
  /** Which comparison the trend represents. Not every tile compares the same span. */
  trendLabel?: string
  series?: number[]
  live?: boolean
  sub?: string
}) {
  const { t, tag } = useT()
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (format ? format(v) : num(Math.round(v), tag)))
  useEffect(() => {
    if (value == null) return
    const c = animate(mv, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, mv])

  const up = trend ? trend.pct >= 0 : null
  return (
    <div className="group relative flex min-w-0 flex-col gap-2 px-4 py-4 sm:px-5 sm:py-5">
      <Corner />
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-[9px] tracking-[0.2em] text-ink-500 uppercase sm:text-[10px]">{label}</span>
        {live && <span className="h-1 w-1 shrink-0 animate-pulse rounded-full bg-ink-200" />}
      </div>

      <motion.span className="truncate font-mono text-2xl leading-none font-light text-ink-50 tabular-nums sm:text-3xl">
        {value == null ? <span className="text-ink-700">——</span> : text}
      </motion.span>

      <div className="flex min-h-[28px] items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {trend ? (
            <span className="font-mono text-[11px] tabular-nums">
              <span className={up ? 'text-ink-100' : 'text-ink-400'}>{up ? '▲' : '▼'} {Math.abs(trend.pct).toFixed(1)}%</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] text-ink-700">{sub ?? t('sig.noTrend')}</span>
          )}
          <span className="truncate font-mono text-[9px] tracking-wider text-ink-600 uppercase">
            {trend ? (trendLabel ?? t('sig.trend7')) : ''}
          </span>
        </div>
        {series && series.length > 3 && <Spark data={series} />}
      </div>
    </div>
  )
}

function Spark({ data }: { data: number[] }) {
  const w = 86, h = 26
  const x = d3.scaleLinear([0, data.length - 1], [0, w])
  const y = d3.scaleLinear([d3.min(data) ?? 0, d3.max(data) ?? 1], [h - 1, 1])
  const line = d3.line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(d3.curveMonotoneX)(data) ?? ''
  const area = d3.area<number>().x((_, i) => x(i)).y0(h).y1((v) => y(v)).curve(d3.curveMonotoneX)(data) ?? ''
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible opacity-70 transition-opacity group-hover:opacity-100">
      <motion.path d={area} fill="var(--ink-700)" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 1 }} />
      <motion.path d={line} fill="none" stroke="var(--ink-200)" strokeWidth={1.2}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
    </svg>
  )
}

/** Thin bracket in the corner: a cheap way to read as instrumentation rather than a card. */
function Corner() {
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 h-2 w-2 border-t border-l border-ink-700" />
      <span className="pointer-events-none absolute right-0 bottom-0 h-2 w-2 border-r border-b border-ink-700 opacity-0 transition-opacity group-hover:opacity-100" />
    </>
  )
}
