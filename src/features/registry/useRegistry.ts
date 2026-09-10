import { useEffect, useMemo, useState } from 'react'
import { CHAINS, IDENTITY_REGISTRY, type ChainKey } from '../../data/chains'
import { getClient } from '../../lib/clients'
import { asString, errMessage, parseAgentURI } from '../../lib/format'
import { REGISTERED, URI_UPDATED } from './abi'
import type { RegistryEvent } from './types'

const POLL_MS = 15_000
const MAX_EVENTS = 200

/** Approximate seconds per block, used to date events without spending an RPC call each. */
const BLOCK_SECONDS: Record<ChainKey, number> = { base: 2, bnb: 3, polygon: 2 }

/**
 * Reads `from`..`to` as a series of calls no wider than the endpoint allows, handing each one
 * to `onChunk` as it lands.
 *
 * A single call used to cover the whole window. Base then lowered its eth_getLogs limit to 2,000
 * blocks and answered every request for the 10,000-block window with `-32614`, so the chain read
 * as permanently broken rather than as a window that needed splitting. Publishing per chunk also
 * means a failure part-way through keeps what was already read.
 */
async function fetchRange(
  chain: ChainKey, from: bigint, to: bigint, head: bigint,
  onChunk: (events: RegistryEvent[], reached: bigint) => void,
): Promise<void> {
  const client = getClient(chain)
  const chunk = CHAINS[chain].logChunk
  const now = Date.now()
  const secs = BLOCK_SECONDS[chain]
  // Estimated from block distance rather than fetching each block: accurate enough for a
  // relative-time column, and it keeps ordering sane for the whole initial range.
  const estimate = (block: bigint) => now - Number(head - block) * secs * 1000

  for (let lo = from; lo <= to; lo = lo + chunk + 1n) {
    const hi = lo + chunk > to ? to : lo + chunk
    const [reg, uri] = await Promise.all([
      client.getLogs({ address: IDENTITY_REGISTRY, event: REGISTERED, fromBlock: lo, toBlock: hi }),
      client.getLogs({ address: IDENTITY_REGISTRY, event: URI_UPDATED, fromBlock: lo, toBlock: hi }),
    ])
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
    onChunk(out, hi)
  }
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
            const wanted = cursor === undefined ? head - cfg.logWindow : cursor + 1n
            const from = head - wanted > cfg.logWindow ? head - cfg.logWindow : wanted
            if (from > head) { cursors[c] = head; return }
            // The cursor advances per chunk, so a chunk that fails leaves the ones before it
            // read rather than replaying the whole window on the next tick.
            await fetchRange(c, from, head, head, (evs, reached) => {
              if (stopped) return
              cursors[c] = reached
              merge(evs, { [c]: head }, { [c]: undefined })
            })
            if (stopped) return
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
