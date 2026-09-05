import { motion } from 'motion/react'

/**
 * Page lead. Uses the mono family like the rest of the instrument panels; a proportional
 * display face read as a different product sitting on top of the dashboard.
 */
export function PageHead({ title, lead, status }: { title: string; lead: string; status?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {status}
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="font-mono text-xl leading-tight font-normal tracking-[0.06em] text-ink-50 uppercase sm:text-2xl"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.6 }}
        className="max-w-2xl font-mono text-[11px] leading-relaxed text-ink-400 sm:text-xs"
      >
        {lead}
      </motion.p>
    </div>
  )
}
