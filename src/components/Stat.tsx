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
    const c = animate(mv, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, mv])
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{label}</span>
      <motion.span className="font-mono text-2xl font-medium text-ink-50 tabular-nums">
        {value == null ? <span className="text-ink-600">—</span> : text}
      </motion.span>
      {sub && <span className="text-xs text-ink-500">{sub}</span>}
    </div>
  )
}
