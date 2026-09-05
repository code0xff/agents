import { useEffect, useState } from 'react'
import facilitators from '../../data/facilitators.json'
import { errMessage } from '../../lib/format'

/**
 * A rate signal for Solana, read from signatures only.
 *
 * Solana has no chain-wide filter for x402 the way USDC's `AuthorizationUsed` log is on EVM, so
 * coverage is limited to facilitators we already know and the figure is a sample, not a count.
 * Reading the transactions themselves would cost about 79 MB an hour at the observed rate; the
 * signature list alone gives block times, which is all a rate needs, for about 7 KB a poll.
 * See docs/research/solana-payments.md.
 */
const RPC = import.meta.env.VITE_RPC_SOLANA ?? 'https://solana-rpc.publicnode.com'
const POLL_MS = 30_000
const LIMIT = 25

const SOLANA_FACILITATORS: { name: string; address: string }[] = facilitators
  .flatMap((f) => ((f.networks as { solana?: string[] }).solana ?? []).map((address) => ({ name: f.name, address })))

interface Signature { blockTime: number | null; err: unknown }

export interface SolanaSource { name: string; address: string; perMinute: number; sampled: number }

export interface SolanaPulse {
  sources: SolanaSource[]
  /** Settlements per minute across every facilitator that answered. */
  perMinute: number | null
  error: string | null
  loading: boolean
}

async function signatures(address: string, signal: AbortSignal): Promise<Signature[]> {
  const r = await fetch(RPC, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: LIMIT }] }),
  })
  if (!r.ok) throw new Error(String(r.status))
  const j = (await r.json()) as { result?: Signature[]; error?: { message?: string } }
  if (j.error) throw new Error(j.error.message ?? 'rpc error')
  return Array.isArray(j.result) ? j.result : []
}

function rate(sigs: Signature[]): { perMinute: number; sampled: number } | null {
  const times = sigs.filter((s) => !s.err && typeof s.blockTime === 'number').map((s) => s.blockTime as number)
  if (times.length < 2) return null
  const span = times[0] - times[times.length - 1]
  if (span <= 0) return null
  return { perMinute: times.length / (span / 60), sampled: times.length }
}

export function useSolanaPulse(): SolanaPulse {
  const [state, setState] = useState<SolanaPulse>({ sources: [], perMinute: null, error: null, loading: true })

  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let running = false
    // Most listed addresses have never signed anything. After the first pass only the ones
    // that answered are polled again, so the dead ones cost one request in total.
    let watch = SOLANA_FACILITATORS

    const tick = async () => {
      if (running || stopped) return
      running = true
      try {
        const results = await Promise.all(watch.map(async (f) => {
          try { return { f, sigs: await signatures(f.address, controller.signal) } }
          catch { return { f, sigs: [] as Signature[] } }
        }))
        if (stopped) return
        const sources: SolanaSource[] = []
        for (const { f, sigs } of results) {
          const r = rate(sigs)
          if (r) sources.push({ name: f.name, address: f.address, ...r })
        }
        if (sources.length > 0) watch = SOLANA_FACILITATORS.filter((f) => sources.some((s) => s.address === f.address))
        sources.sort((a, b) => b.perMinute - a.perMinute)
        setState({
          sources,
          perMinute: sources.length ? sources.reduce((a, s) => a + s.perMinute, 0) : null,
          error: null, loading: false,
        })
      } catch (e) {
        if (!stopped) setState((s) => ({ ...s, error: errMessage(e), loading: false }))
      } finally {
        running = false
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => { stopped = true; controller.abort(); clearInterval(id) }
  }, [])

  return state
}
