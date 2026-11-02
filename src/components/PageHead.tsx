import { motion } from 'motion/react'

/** Page lead: sans title and muted lead line, as on the 1gateway site. */
export function PageHead({ title, lead, status }: { title: string; lead: string; status?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {status}
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-[clamp(24px,5vw,32px)] leading-tight font-medium tracking-[-.04em] text-ink-50"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.6 }}
        className="max-w-[560px] text-[14px] text-ink-400"
      >
        {lead}
      </motion.p>
    </div>
  )
}
