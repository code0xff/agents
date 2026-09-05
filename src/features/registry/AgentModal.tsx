import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/Panel'
import { CHAINS } from '../../data/chains'
import { useT } from '../../i18n'
import { short, timeAgo } from '../../lib/format'
import { fetchAgentMeta, type MetaFetch } from './meta'
import type { RegistryEvent } from './types'

export function AgentModal({ event, onClose }: { event: RegistryEvent | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {event && <Dialog key={event.key} event={event} onClose={onClose} />}
    </AnimatePresence>
  )
}

function Dialog({ event, onClose }: { event: RegistryEvent; onClose: () => void }) {
  const { t } = useT()
  const cfg = CHAINS[event.chain]
  const closeRef = useRef<HTMLButtonElement>(null)
  // The dialog is keyed per event, so the initial state can be derived instead of being
  // reset from an effect.
  const [state, setState] = useState<MetaFetch | null>(() => (event.uri ? null : { status: 'none' }))

  useEffect(() => {
    if (!event.uri) return
    const controller = new AbortController()
    fetchAgentMeta(event.uri, controller.signal).then((r) => { if (!controller.signal.aborted) setState(r) })
    return () => controller.abort()
  }, [event.uri])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const meta = state && 'meta' in state ? state.meta : null
  const title = meta?.name ?? event.name ?? `#${event.agentId.toString()}`

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-label={`${t('agent.title')} ${title}`}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-ink-800 bg-ink-950 sm:rounded-xl"
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink-800 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {meta?.image && (
              <img src={meta.image} alt="" loading="lazy"
                className="h-10 w-10 shrink-0 rounded border border-ink-800 object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase">
                {cfg.short} · #{event.agentId.toString()} · {timeAgo(event.ts)}
              </p>
              <h2 className="truncate text-base font-medium text-ink-50">{title}</h2>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('agent.close')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-ink-800 text-ink-400 transition hover:border-ink-600 hover:text-ink-100 focus-visible:border-ink-500 focus-visible:outline-none">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-5 px-5 py-4">
          {state === null && <p className="font-mono text-xs text-ink-500">{t('agent.loading')}…</p>}

          {meta && (
            <>
              <p className="text-sm leading-relaxed text-ink-300">
                {meta.description ?? t('agent.noDescription')}
              </p>
              <div className="flex flex-wrap gap-2">
                {meta.active != null && <Badge dim={!meta.active}>{t(meta.active ? 'agent.active' : 'agent.inactive')}</Badge>}
                {meta.x402Support && <Badge>x402</Badge>}
                {meta.supportedTrust.map((x) => <Badge key={x} dim>{x}</Badge>)}
              </div>
              {meta.services.length > 0 && <Section title={t('agent.services')}>
                <ul className="flex flex-col gap-1">
                  {meta.services.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
                      <span className="text-ink-500">{s.name}</span>
                      <a href={s.endpoint} target="_blank" rel="noreferrer noopener"
                        className="truncate text-ink-200 underline decoration-ink-700 underline-offset-2 hover:decoration-ink-300">
                        {s.endpoint}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>}
            </>
          )}

          {state?.status === 'blocked' && <p className="text-xs leading-relaxed text-ink-400">{t('agent.blocked')}</p>}
          {state?.status === 'none' && <p className="text-xs leading-relaxed text-ink-400">{t('agent.none')}</p>}

          <Section title={t('agent.identity')}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 font-mono text-[11px]">
              <Row label={t('agent.chain')} value={cfg.label} />
              <Row label={t('agent.agentId')} value={event.agentId.toString()} />
              <Row label={t(event.kind === 'registered' ? 'agent.owner' : 'agent.updater')}
                value={short(event.actor, 6)} href={`${cfg.explorer}/address/${event.actor}`} />
              <Row label={t('agent.block')} value={event.block.toString()} />
              <Row label={t('agent.tx')} value={short(event.tx, 8)} href={`${cfg.explorer}/tx/${event.tx}`} />
              {event.uri && <Row label={t('agent.source')} value={sourceLabel(event.uri)}
                href={event.uri.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${event.uri.slice(7)}` : event.uri} />}
            </dl>
          </Section>
        </div>
      </motion.div>
    </motion.div>
  )
}

function sourceLabel(uri: string) {
  if (uri.startsWith('data:')) return 'inline'
  if (uri.startsWith('ipfs://')) return 'ipfs'
  try { return new URL(uri).host } catch { return uri.slice(0, 32) }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className="truncate text-ink-200">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener"
            className="underline decoration-ink-700 underline-offset-2 hover:decoration-ink-300">{value}</a>
        ) : value}
      </dd>
    </>
  )
}
