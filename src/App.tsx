import { motion } from 'motion/react'

const sections = [
  { id: 'marketplaces', title: 'Marketplaces', desc: 'Agent marketplace directory' },
  { id: 'registry', title: 'ERC-8004 Registry', desc: 'Live agent registration log' },
  { id: 'payments', title: 'x402 Payments', desc: 'Facilitator payment flow graph' },
]

export default function App() {
  return (
    <div className="bg-grid relative min-h-full">
      <header className="border-b border-ink-800 px-8 py-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-mono text-sm tracking-[0.3em] text-ink-300 uppercase"
        >
          Agent Economy Observatory
        </motion.h1>
      </header>

      <main className="grid gap-6 p-8 md:grid-cols-3">
        {sections.map((s, i) => (
          <motion.section
            key={s.id}
            id={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.5 }}
            className="rounded-lg border border-ink-800 bg-ink-900/60 p-6 backdrop-blur"
          >
            <h2 className="text-lg font-medium text-ink-50">{s.title}</h2>
            <p className="mt-2 text-sm text-ink-400">{s.desc}</p>
            <p className="mt-6 font-mono text-xs text-ink-500">// TODO: see docs/</p>
          </motion.section>
        ))}
      </main>
    </div>
  )
}
