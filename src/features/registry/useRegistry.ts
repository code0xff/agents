import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CHAINS, IDENTITY_REGISTRY, type ChainKey } from '../../data/chains'
import { getClient } from '../../lib/clients'
import { parseAgentURI } from '../../lib/format'
import { REGISTERED, URI_UPDATED } from './abi'
import type { RegistryEvent } from './types'

const POLL_MS = 15_000
const MAX_EVENTS = 200

async function fetchRange(chain: ChainKey, from: bigint, to: bigint): Promise<RegistryEvent[]> {
  const client = getClient(chain)
  const [reg, uri] = await Promise.all([
    client.getLogs({ address: IDENTITY_REGISTRY, event: REGISTERED, fromBlock: from, toBlock: to }),
    client.getLogs({ address: IDENTITY_REGISTRY, event: URI_UPDATED, fromBlock: from, toBlock: to }),
  ])
  const out: RegistryEvent[] = []
  const now = Date.now()
  for (const l of reg) {
    const meta = parseAgentURI(l.args.agentURI ?? '')
    out.push({
      key: `${chain}:${l.transactionHash}:${l.logIndex}`, chain, kind: 'registered',
      agentId: l.args.agentId!, owner: l.args.owner!, uri: l.args.agentURI ?? '',
      name: meta?.name as string | undefined, description: meta?.description as string | undefined,
      x402: meta?.x402Support as boolean | undefined,
      block: l.blockNumber, tx: l.transactionHash, ts: now,
    })
  }
  for (const l of uri) {
    const meta = parseAgentURI(l.args.newURI ?? '')
    out.push({
      key: `${chain}:${l.transactionHash}:${l.logIndex}`, chain, kind: 'uri',
      agentId: l.args.agentId!, owner: l.args.updater!, uri: l.args.newURI ?? '',
      name: meta?.name as string | undefined, description: meta?.description as string | undefined,
      x402: meta?.x402Support as boolean | undefined,
      block: l.blockNumber, tx: l.transactionHash, ts: now,
    })
  }
  return out
}

/** Attach block timestamps to logs (accurate relative time on initial load; only the most recent N). */
async function stampTimes(chain: ChainKey, evs: RegistryEvent[], limit = 12) {
  const client = getClient(chain)
  const blocks = [...new Set(evs.slice(0, limit).map((e) => e.block))]
  const times = new Map<bigint, number>()
  await Promise.all(blocks.map(async (b) => {
    try { const blk = await client.getBlock({ blockNumber: b }); times.set(b, Number(blk.timestamp) * 1000) } catch { /* keep now */ }
  }))
  for (const e of evs) { const t = times.get(e.block); if (t) e.ts = t }
}

export interface RegistryState {
  events: RegistryEvent[]
  heads: Partial<Record<ChainKey, bigint>>
  errors: Partial<Record<ChainKey, string>>
  loading: boolean
}

export function useRegistry(chains: ChainKey[]) {
  const qc = useQueryClient()
  const cursors = useRef<Partial<Record<ChainKey, bigint>>>({})
  const [state, setState] = useState<RegistryState>({ events: [], heads: {}, errors: {}, loading: true })

  const merge = (incoming: RegistryEvent[], heads: Partial<Record<ChainKey, bigint>>, errors: Partial<Record<ChainKey, string>>) =>
    setState((s) => {
      const seen = new Set(s.events.map((e) => e.key))
      const fresh = incoming.filter((e) => !seen.has(e.key))
      const events = [...fresh, ...s.events].sort((a, b) => b.ts - a.ts || Number(b.block - a.block)).slice(0, MAX_EVENTS)
      return { events, heads: { ...s.heads, ...heads }, errors: { ...s.errors, ...errors }, loading: false }
    })

  // Initial load
  const initial = useQuery({
    queryKey: ['registry-initial', chains],
    queryFn: async () => {
      const heads: Partial<Record<ChainKey, bigint>> = {}
      const errors: Partial<Record<ChainKey, string>> = {}
      const all: RegistryEvent[] = []
      await Promise.all(chains.map(async (c) => {
        try {
          const client = getClient(c)
          const head = await client.getBlockNumber()
          const evs = await fetchRange(c, head - CHAINS[c].logRange, head)
          evs.sort((a, b) => Number(b.block - a.block))
          await stampTimes(c, evs)
          all.push(...evs); heads[c] = head; cursors.current[c] = head
        } catch (e) { errors[c] = (e as Error).message.split('\n')[0] }
      }))
      merge(all, heads, errors)
      return true
    },
    staleTime: Infinity,
  })

  // Polling
  useEffect(() => {
    if (!initial.data) return
    let stop = false
    const tick = async () => {
      await Promise.all(chains.map(async (c) => {
        const from = cursors.current[c]
        if (from == null) return
        try {
          const client = getClient(c)
          const head = await client.getBlockNumber()
          if (head <= from) return
          const evs = await fetchRange(c, from + 1n, head)
          cursors.current[c] = head
          if (!stop) merge(evs, { [c]: head }, { [c]: undefined })
        } catch (e) { if (!stop) merge([], {}, { [c]: (e as Error).message.split('\n')[0] }) }
      }))
    }
    const id = setInterval(tick, POLL_MS)
    return () => { stop = true; clearInterval(id) }
  }, [initial.data, chains, qc])

  return state
}
