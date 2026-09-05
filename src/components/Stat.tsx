import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { useT } from '../i18n'
import { num } from '../lib/format'

export function Stat({ label, value, format, sub }: {
  label: string; value: number | null | undefined; format?: (n: number) => string; sub?: string
}) {
  const { tag } = useT()
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (format ? format(v) : num(Math.round(v), tag)))
  useEffect(() => {
    if (value == null) return
    const controls = animate(mv, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, mv])
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-5 sm:py-4">
      <span className="font-mono text-[9px] leading-tight tracking-[0.2em] text-ink-500 uppercase sm:text-[10px] sm:tracking-[0.25em]">{label}</span>
      <motion.span className="truncate font-mono text-lg font-medium text-ink-50 tabular-nums sm:text-2xl">
        {value == null ? <span className="text-ink-600">—</span> : text}
      </motion.span>
      {sub && <span className="truncate text-[10px] text-ink-500 sm:text-[11px]">{sub}</span>}
    </div>
  )
}
