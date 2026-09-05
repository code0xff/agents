import { motion } from 'motion/react'
import { useState } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { Pagination, usePagination } from '../../components/Pagination'
import { CHAINS, type ChainKey } from '../../data/chains'
import { useT, type Translate } from '../../i18n'
import { short, timeAgo } from '../../lib/format'
import { useIsMobile } from '../../lib/useMediaQuery'
import type { RegistryState } from './useRegistry'
import { AgentModal } from './AgentModal'
import type { RegistryEvent } from './types'

/**
 * Ethereum was dropped: it holds 68k agents cumulatively but produced one registration in six
 * hours, so the panel was almost always empty there. Polygon carries none at all.
 */
const ALL: ChainKey[] = ['base', 'bnb']

function fallbackLabel(e: RegistryEvent, t: Translate) {
  if (!e.uri) return t('reg.noUri')
  if (e.uri.startsWith('ipfs')) return t('reg.ipfsMeta')
  if (e.uri.startsWith('http')) { try { return new URL(e.uri).host } catch { return t('reg.unnamed') } }
  return t('reg.unnamed')
}

function Row({ e, t, onOpen }: { e: RegistryEvent; t: Translate; onOpen: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ animation: 'flash 2.5s ease-out' }}
      transition={{ duration: 0.5 }}
      className="border-b border-ink-800/60 font-mono text-xs hover:bg-ink-800/30"
    >
      <button type="button" onClick={onOpen} className="w-full cursor-pointer px-4 py-2.5 text-left sm:px-5">
        {/* Mobile stacks the row in two lines; from sm up it is a single line. */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap sm:gap-3">
          <span className="w-7 shrink-0 text-ink-500 tabular-nums">{timeAgo(e.ts)}</span>
          <span className={`shrink-0 ${e.kind === 'registered' ? 'text-ink-100' : 'text-ink-400'}`}>
            {e.kind === 'registered' ? t('reg.register') : t('reg.seturi')}
          </span>
          <span className="shrink-0 text-ink-500">#{e.agentId.toString()}</span>
          {e.x402 && <Badge dim>x402</Badge>}
          <span className="ml-auto shrink-0 text-ink-500">{short(e.actor)}</span>
          <span className="w-full min-w-0 basis-full truncate text-ink-200 sm:order-none sm:w-auto sm:basis-auto sm:flex-1">
            {e.name ?? <span className="text-ink-600">{fallbackLabel(e, t)}</span>}
          </span>
        </span>
      </button>
    </motion.li>
  )
}

export function RegistryLog({ state }: { state: RegistryState }) {
  const { t } = useT()
  const isMobile = useIsMobile()
  // One chain at a time, as on the payments page. A merged stream is ordered by time, so the
  // busiest chain crowds the others out of view rather than sitting beside them.
  const [chain, setChain] = useState<ChainKey>('base')
  const { events, heads, errors, loading, allFailed } = state
  const shown = events.filter((e) => e.chain === chain)
  const paged = usePagination(shown, isMobile ? 8 : 12)
  const [open, setOpen] = useState<RegistryEvent | null>(null)

  // While the reader is off page 1, show what arrived so the shifting list is explainable.
  const newCount = paged.addedSinceLeaving

  return (
    <Panel eyebrow={t('reg.eyebrow')} title={t('reg.title')} delay={0.1}
      right={
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <button onClick={() => paged.setPage(1)}
              className="rounded-full border border-ink-600 px-2 py-0.5 font-mono text-[10px] text-ink-200 hover:bg-ink-800">
              {t('page.newItems', { n: newCount })}
            </button>
          )}
          <div role="radiogroup" aria-label={t('reg.chain')} className="flex items-center gap-1">
            {ALL.map((c) => (
              <button key={c} role="radio" aria-checked={chain === c} onClick={() => setChain(c)}
                className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider transition ${chain === c ? 'border-ink-500 text-ink-100' : 'border-ink-800 text-ink-600 hover:text-ink-300'}`}
                title={errors[c] ?? CHAINS[c].label}>
                {CHAINS[c].short}{errors[c] ? ' !' : ''}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] text-ink-500">
            {heads[chain] ? `${t('common.block')} ${heads[chain]}` : '—'}
          </span>
          <LiveDot active={!loading && !allFailed && !errors[chain]} />
        </div>
      }>
      <ul>
        {loading && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.scanning')}</li>}
        {allFailed && (
          <li className="px-5 py-8 text-center font-mono text-xs text-ink-400">
            {t('reg.allFailed')}
            <span className="mt-1 block text-ink-600">{Object.values(errors).filter(Boolean)[0]}</span>
          </li>
        )}
        {!loading && !allFailed && shown.length === 0 && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.empty')}</li>}
        {/* Deliberately not wrapped in AnimatePresence: on a page change the outgoing rows
            would linger through their exit animation, so the list briefly holds twice the
            page size. Rows still animate in on mount. */}
        {paged.items.map((e) => <Row key={e.key} e={e} t={t} onOpen={() => setOpen(e)} />)}
      </ul>
      <Pagination paged={paged} />
      <AgentModal event={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}
