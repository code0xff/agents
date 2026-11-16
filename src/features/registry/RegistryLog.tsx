import { motion } from 'motion/react'
import { useState } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { Pagination, usePagination } from '../../components/Pagination'
import { CHAINS, type ChainKey } from '../../data/chains'
import { useT, type Translate } from '../../i18n'
import { short, spanFrom, timeAgo } from '../../lib/format'
import { useIsMobile } from '../../lib/useMediaQuery'
import type { RegistryState } from './useRegistry'
import { AgentModal } from './AgentModal'
import type { RegistryEvent } from './types'
import { chip, primaryBtn } from '../../components/ui'

/**
 * Ethereum was dropped: it holds 68k agents cumulatively but produced one registration in six
 * hours, so the panel was almost always empty there. Polygon carries none at all.
 */
const ALL: ChainKey[] = ['base', 'bnb', 'arc']

function fallbackLabel(e: RegistryEvent, t: Translate) {
  if (!e.uri) return t('reg.noUri')
  if (e.uri.startsWith('ipfs')) return t('reg.ipfsMeta')
  if (e.uri.startsWith('http')) { try { return new URL(e.uri).host } catch { return t('reg.unnamed') } }
  return t('reg.unnamed')
}

/** Shared by the header and every row so the columns line up. Mobile keeps the stacked layout. */
const COLS = 'sm:grid sm:grid-cols-[3rem_5.5rem_6.5rem_minmax(0,1fr)_8.5rem] sm:items-center sm:gap-x-4'

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
        {/* Mobile stacks the row in two lines; from sm up it is a table row under the header. */}
        <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${COLS}`}>
          <span className="w-7 shrink-0 text-ink-500 tabular-nums sm:w-auto">{timeAgo(e.ts)}</span>
          <span className={`shrink-0 ${e.kind === 'registered' ? 'text-ink-100' : 'text-ink-400'}`}>
            {e.kind === 'registered' ? t('reg.register') : t('reg.seturi')}
          </span>
          <span className="shrink-0 text-ink-400 tabular-nums">#{e.agentId.toString()}</span>
          <span className="order-last flex w-full min-w-0 basis-full items-center gap-2 sm:order-none sm:w-auto sm:basis-auto">
            <span className="min-w-0 truncate text-ink-200">{e.name ?? <span className="text-ink-500">{fallbackLabel(e, t)}</span>}</span>
            {e.x402 && <Badge dim>x402</Badge>}
          </span>
          <span className="ml-auto shrink-0 text-ink-500 sm:ml-0 sm:text-right">{short(e.actor)}</span>
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
  // What the list actually reaches back to, rather than a claim about being live.
  const span = spanFrom(shown[shown.length - 1]?.ts)
  const paged = usePagination(shown, isMobile ? 8 : 12, chain)
  const [open, setOpen] = useState<RegistryEvent | null>(null)

  // While the reader is off page 1, show what arrived so the shifting list is explainable.
  const newCount = paged.addedSinceLeaving

  return (
    <Panel eyebrow={t('reg.eyebrow')} title={t('reg.title')} delay={0.1}
      right={
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <button onClick={() => paged.setPage(1)}
              className={primaryBtn}>
              {t('page.newItems', { n: newCount })}
            </button>
          )}
          <div role="radiogroup" aria-label={t('reg.chain')} className="flex items-center gap-1">
            {ALL.map((c) => (
              <button key={c} role="radio" aria-checked={chain === c} onClick={() => setChain(c)}
                className={chip(chain === c)}
                title={errors[c] ?? CHAINS[c].label}>
                {CHAINS[c].short}{errors[c] ? ' !' : ''}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] text-ink-500">
            {span ? t('common.spanShown', { span }) : heads[chain] ? `${t('common.block')} ${heads[chain]}` : '—'}
          </span>
          <LiveDot active={!loading && !allFailed && !errors[chain]} />
        </div>
      }>
      <div aria-hidden className={`hidden border-b border-ink-800 px-4 py-2 font-mono text-[10px] tracking-[.035em] text-ink-500 uppercase sm:px-5 ${COLS}`}>
        <span>{t('reg.col.time')}</span><span>{t('reg.col.event')}</span><span>{t('reg.col.id')}</span>
        <span>{t('reg.col.agent')}</span><span className="text-right">{t('reg.col.owner')}</span>
      </div>
      <ul>
        {loading && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.scanning')}</li>}
        {allFailed && (
          <li className="px-5 py-8 text-center font-mono text-xs text-ink-400">
            {t('reg.allFailed')}
            <span className="mt-1 block text-ink-500">{Object.values(errors).filter(Boolean)[0]}</span>
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
