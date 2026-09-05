import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Badge, LiveDot, Panel } from '../../components/Panel'
import { Pagination, usePagination } from '../../components/Pagination'
import { CHAINS, type ChainKey } from '../../data/chains'
import { useT, type Translate } from '../../i18n'
import { short, timeAgo } from '../../lib/format'
import { useIsMobile } from '../../lib/useMediaQuery'
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
  const name = e.name ?? null
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{ animation: 'flash 2.5s ease-out' }}
      transition={{ duration: 0.5 }}
      className="cursor-pointer border-b border-ink-800/60 px-4 py-2.5 font-mono text-xs hover:bg-ink-800/30 sm:px-5"
      onClick={() => setOpen((v) => !v)}
    >
      {/* Mobile stacks the row in two lines; from sm up it is a single line. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap sm:gap-3">
        <span className="w-7 shrink-0 text-ink-500 tabular-nums">{timeAgo(e.ts)}</span>
        <Badge>{cfg.short}</Badge>
        <span className={`shrink-0 ${e.kind === 'registered' ? 'text-ink-100' : 'text-ink-400'}`}>
          {e.kind === 'registered' ? t('reg.register') : t('reg.seturi')}
        </span>
        <span className="shrink-0 text-ink-500">#{e.agentId.toString()}</span>
        {e.x402 && <Badge dim>x402</Badge>}
        <a className="ml-auto shrink-0 text-ink-500 hover:text-ink-200"
          href={`${cfg.explorer}/tx/${e.tx}`} target="_blank" rel="noreferrer"
          onClick={(ev) => ev.stopPropagation()}>{short(e.owner)}</a>
        <span className="w-full min-w-0 basis-full truncate text-ink-200 sm:order-none sm:w-auto sm:basis-auto sm:flex-1">
          {name ?? <span className="text-ink-600">{fallbackLabel(e, t)}</span>}
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-2 text-[11px] leading-relaxed break-words text-ink-400 sm:pl-11">
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
  const isMobile = useIsMobile()
  const [chains, setChains] = useState<ChainKey[]>(ALL)
  const { events, heads, errors, loading } = useRegistry(ALL)
  const shown = events.filter((e) => chains.includes(e.chain))
  const paged = usePagination(shown, isMobile ? 8 : 12)

  // While the reader is off page 1, count what arrived so the shifting list is explainable.
  const [anchor, setAnchor] = useState<number | null>(null)
  useEffect(() => {
    if (paged.page === 1) setAnchor(null)
    else setAnchor((a) => (a === null ? paged.total : a))
  }, [paged.page, paged.total])
  const newCount = anchor === null ? 0 : Math.max(0, paged.total - anchor)

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
      <ul>
        {loading && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.scanning')}</li>}
        {!loading && shown.length === 0 && <li className="px-5 py-8 text-center font-mono text-xs text-ink-500">{t('reg.empty')}</li>}
        <AnimatePresence initial={false}>
          {paged.items.map((e) => <Row key={e.key} e={e} t={t} />)}
        </AnimatePresence>
      </ul>
      <Pagination paged={paged} />
    </Panel>
  )
}
