import * as d3 from 'd3'
import { motion } from 'motion/react'

export function Sparkline({ data, w = 120, h = 28, className = '' }: { data: number[]; w?: number; h?: number; className?: string }) {
  if (!data.length) return null
  const x = d3.scaleLinear([0, data.length - 1], [0, w])
  const y = d3.scaleLinear([d3.min(data) ?? 0, d3.max(data) ?? 1], [h - 2, 2])
  const d = d3.line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(d3.curveMonotoneX)(data) ?? ''
  return (
    <svg width={w} height={h} className={`overflow-visible ${className}`}>
      <motion.path d={d} fill="none" stroke="var(--ink-200)" strokeWidth={1.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
    </svg>
  )
}
