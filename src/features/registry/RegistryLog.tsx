import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { CHAINS, type ChainKey } from '../../data/chains'
import { useT, type Translate } from '../../i18n'
import { short, timeAgo } from '../../lib/format'
import { useRegistry } from './useRegistry'
import type { RegistryEvent } from './types'

const ALL: ChainKey[] = ['base', 'ethereum', 'bnb']

function fallbackLabel(e: RegistryEvent, t: Translate) {
  if (!e.uri) return t('reg.noUri')
  if (e.uri.startsWith('ipfs')) return t('reg.ipfsMeta')
  if (e.uri.startsWith('http')) { try { return new URL(e.uri).host } catch { return t('reg.unnamed') } }
  return t('reg.unnamed')
}

function Row({ e, t }: { e: RegistryEvent; t: Translate }) {
  const cfg = CHAINS[e.chain]
  const [open, setOpen] = useState(false)
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{ animation: 'flash 2.5s ease-out' }}
      transition={{ duration: 0.5 }}
      className="border-b border-ink-800/60 px-5 py-2.5 font-mono text-xs hover:bg-ink-800/30"
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 shrink-0 text-ink-500 tabular-nums">{timeAgo(e.ts)}</span>
        <Badge>{cfg.short}</Badge>
        <span className={`shrink-0 ${e.kind === 'registered' ? 'text-ink-100' : 'text-ink-400'}`}>
          {e.kind === 'registered' ? t('reg.register') : t('reg.seturi')}
        </span>
        <span className="text-ink-500">#{e.agentId.toString()}</span>
        <span className="truncate text-ink-200">{e.name ?? <span className="text-ink-600">{fallbackLabel(e, t)}</span>}</span>
        {e.x402 && <Badge dim>x402</Badge>}
        <a className="ml-auto shrink-0 text-ink-500 hover:text-ink-200" href={`${cfg.explorer}/tx/${e.tx}`} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
          {short(e.owner)}
        </a>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-2 pl-11 text-[11px] leading-relaxed text-ink-400">
              {e.description ?? t('reg.noDescription')}{' '}
              {e.uri.startsWith('http') && <a className="underline" href={e.uri} target="_blank" rel="noreferrer">{t('reg.metadataLink')} ↗</a>}
              <span className="block text-ink-600">{t('common.block')} {e.block.toString()}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

export function RegistryLog() {
  const { t } = useT()
  const [chains, setChains] = useState<ChainKey[]>(ALL)
  const { events, heads, errors, loading } = useRegistry(ALL)
  const shown = events.filter((e) => chains.includes(e.chain))
  return (
    <Panel eyebrow={t('reg.eyebrow')} title={t('reg.title')} delay={0.1}
      right={
        <div className="flex items-center gap-2">
          {ALL.map((c) => (
            <button key={c} onClick={() => setChains((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c])}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider transition ${chains.includes(c) ? 'border-ink-500 text-ink-100' : 'border-ink-800 text-ink-600'}`}
              title={errors[c] ?? (heads[c] ? `${t('common.block')} ${heads[c]}` : '')}>
              {CHAINS[c].short}{errors[c] ? ' !' : ''}
            </button>
          ))}
          <LiveDot active={!loading} />
        </div>
      }>
      <ul className="max-h-[520px] overflow-y-auto">
        {loading && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.scanning')}</li>}
        {!loading && shown.length === 0 && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.empty')}</li>}
        <AnimatePresence initial={false}>
          {shown.map((e) => <Row key={e.key} e={e} t={t} />)}
        </AnimatePresence>
      </ul>
    </Panel>
  )
}
