import { motion } from 'motion/react'
import type { Theme } from '../lib/theme'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark'
  return (
    <button onClick={onToggle} aria-label="Toggle theme"
      className="flex items-center gap-2 rounded-full border border-ink-800 px-2 py-1 font-mono text-[10px] tracking-wider text-ink-400 uppercase transition hover:border-ink-600 hover:text-ink-100">
      <span className="relative h-4 w-8 rounded-full bg-ink-800">
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-ink-100 ${dark ? 'left-0.5' : 'left-[18px]'}`} />
      </span>
      {dark ? 'dark' : 'light'}
    </button>
  )
}
