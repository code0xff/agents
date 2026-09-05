import { useEffect, useMemo, useState } from 'react'
import { CHAINS, IDENTITY_REGISTRY, type ChainKey } from '../../data/chains'
import { getClient } from '../../lib/clients'
import { asString, errMessage, parseAgentURI } from '../../lib/format'
import { REGISTERED, URI_UPDATED } from './abi'
import type { RegistryEvent } from './types'

const POLL_MS = 15_000
const MAX_EVENTS = 200

/** Approximate seconds per block, used to date events without spending an RPC call each. */
const BLOCK_SECONDS: Record<ChainKey, number> = { base: 2, ethereum: 12, bnb: 3 }

async function fetchRange(chain: ChainKey, from: bigint, to: bigint, head: bigint): Promise<RegistryEvent[]> {
  const client = getClient(chain)
  const [reg, uri] = await Promise.all([
    client.getLogs({ address: IDENTITY_REGISTRY, event: REGISTERED, fromBlock: from, toBlock: to }),
    client.getLogs({ address: IDENTITY_REGISTRY, event: URI_UPDATED, fromBlock: from, toBlock: to }),
  ])
  const now = Date.now()
  const secs = BLOCK_SECONDS[chain]
  // Estimated from block distance rather than fetching each block: accurate enough for a
  // relative-time column, and it keeps ordering sane for the whole initial range.
  const estimate = (block: bigint) => now - Number(head - block) * secs * 1000

  const out: RegistryEvent[] = []
  const push = (
    kind: RegistryEvent['kind'], agentId: bigint, actor: `0x${string}`, rawUri: string,
    block: bigint, tx: `0x${string}`, logIndex: number,
  ) => {
    const meta = parseAgentURI(rawUri)
    out.push({
      key: `${chain}:${tx}:${logIndex}`, chain, kind, agentId, actor, uri: rawUri,
      name: asString(meta?.name), description: asString(meta?.description),
      x402: typeof meta?.x402Support === 'boolean' ? meta.x402Support : undefined,
      block, tx, ts: estimate(block),
    })
  }
  for (const l of reg) push('registered', l.args.agentId!, l.args.owner!, l.args.agentURI ?? '', l.blockNumber, l.transactionHash, l.logIndex)
  for (const l of uri) push('uri', l.args.agentId!, l.args.updater!, l.args.newURI ?? '', l.blockNumber, l.transactionHash, l.logIndex)
  return out
}

export interface RegistryState {
  events: RegistryEvent[]
  heads: Partial<Record<ChainKey, bigint>>
  errors: Partial<Record<ChainKey, string>>
  loading: boolean
  /** True when no chain has produced a successful read yet. */
  allFailed: boolean
}

export function useRegistry(chains: readonly ChainKey[]) {
  const [state, setState] = useState<Omit<RegistryState, 'allFailed'>>({
    events: [], heads: {}, errors: {}, loading: true,
  })

  useEffect(() => {
    let stopped = false
    let running = false
    // Null means this chain has not completed an initial read yet, so the next tick retries it.
    const cursors: Partial<Record<ChainKey, bigint>> = {}

    const merge = (incoming: RegistryEvent[], heads: Partial<Record<ChainKey, bigint>>, errors: Partial<Record<ChainKey, string>>) =>
      setState((s) => {
        const seen = new Set(s.events.map((e) => e.key))
        const fresh = incoming.filter((e) => !seen.has(e.key))
        const events = [...fresh, ...s.events]
          .sort((a, b) => b.ts - a.ts || Number(b.block - a.block))
          .slice(0, MAX_EVENTS)
        return { events, heads: { ...s.heads, ...heads }, errors: { ...s.errors, ...errors }, loading: false }
      })

    const tick = async () => {
      if (running || stopped) return
      running = true
      try {
        await Promise.all(chains.map(async (c) => {
          const cfg = CHAINS[c]
          try {
            const client = getClient(c)
            const head = await client.getBlockNumber()
            const cursor = cursors[c]
            // No cursor means either the first run or a previous failure: read a bounded
            // initial window. Otherwise read forward, capped at this chain's log range.
            const wanted = cursor === undefined ? head - cfg.logRange : cursor + 1n
            const from = head - wanted > cfg.logRange ? head - cfg.logRange : wanted
            if (from > head) { cursors[c] = head; return }
            const evs = await fetchRange(c, from, head, head)
            if (stopped) return
            cursors[c] = head
            merge(evs, { [c]: head }, { [c]: undefined })
          } catch (e) {
            if (!stopped) merge([], {}, { [c]: errMessage(e) })
          }
        }))
      } finally {
        running = false
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => { stopped = true; clearInterval(id) }
  }, [chains])

  const allFailed = useMemo(
    () => !state.loading && chains.length > 0 && chains.every((c) => state.errors[c] != null),
    [state.loading, state.errors, chains],
  )
  return { ...state, allFailed }
}
