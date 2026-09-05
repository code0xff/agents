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
      className={`relative overflow-hidden rounded-xl border border-ink-800 bg-ink-900/60 backdrop-blur-md ${className}`}
    >
      <header className="flex items-center justify-between border-b border-ink-800 px-5 py-3">
        <div>
          {eyebrow && <p className="font-mono text-[10px] tracking-[0.3em] text-ink-500 uppercase">{eyebrow}</p>}
          <h2 className="text-sm font-medium text-ink-100">{title}</h2>
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

export function Badge({ children, dim = false }: { children: ReactNode; dim?: boolean }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${dim ? 'border-ink-800 text-ink-500' : 'border-ink-700 text-ink-300'}`}>
      {children}
    </span>
  )
}
