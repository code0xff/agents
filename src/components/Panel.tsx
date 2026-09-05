import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export function Panel({ title, eyebrow, right, children, className = '', delay = 0 }: {
  title: string; eyebrow?: string; right?: ReactNode; children: ReactNode; className?: string; delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border border-ink-800 bg-panel backdrop-blur-md ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-800 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {eyebrow && <p className="truncate font-mono text-[10px] tracking-[0.25em] text-ink-500 uppercase">{eyebrow}</p>}
          <h2 className="text-[13px] font-medium tracking-[0.02em] text-ink-100">{title}</h2>
        </div>
        {right}
      </header>
      {children}
    </motion.section>
  )
}

export function LiveDot({ active = true }: { active?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink-200 opacity-60" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? 'bg-ink-100' : 'bg-ink-600'}`} />
    </span>
  )
}

export function Badge({ children, dim = false, title }: { children: ReactNode; dim?: boolean; title?: string }) {
  return (
    <span title={title} className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider whitespace-nowrap uppercase ${dim ? 'border-ink-800 text-ink-500' : 'border-ink-700 text-ink-300'}`}>
      {children}
    </span>
  )
}
