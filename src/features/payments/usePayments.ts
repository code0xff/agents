import { useEffect, useMemo, useState } from 'react'
import { decodeFunctionData, formatUnits, parseAbi, parseAbiItem, type Hex } from 'viem'
import { USDC_BASE } from '../../data/chains'
import facilitators from '../../data/facilitators.json'
import { getClient } from '../../lib/clients'
import { errMessage, short } from '../../lib/format'

const ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
])
/**
 * USDC emits AuthorizationUsed only from a successful EIP-3009 call, so this one log set is
 * exactly the settlements: no reverted authorisation appears, and nothing else does either.
 * Scanning full blocks to find them downloaded roughly 250 KB per block to keep a handful of
 * transactions; this reads about 0.5 KB per block and then fetches only the transactions named.
 */
const AUTHORIZATION_USED = parseAbiItem('event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)')

export const FACILITATOR_BY_ADDR: Record<string, string> = {}
for (const f of facilitators) for (const a of f.networks.base ?? []) FACILITATOR_BY_ADDR[a.toLowerCase()] = f.name

export interface Payment {
  key: string
  block: bigint
  tx: Hex
  facilitator: string
  facilitatorName: string | null
  payer: string
  payTo: string
  /** Raw USDC base units (6 decimals). Kept exact; converted only for display. */
  units: bigint
  usdc: number
  ts: number
}

export interface PaymentsState {
  payments: Payment[]
  head: bigint | null
  blocksScanned: number
  error: string | null
  /** Derived from the retained window, so it never counts evicted rows. */
  senderCounts: Record<string, number>
}

const POLL_MS = 10_000
const BACKFILL = 150n
/**
 * Cap for a single catch-up so a backgrounded tab cannot ask for an unbounded range. Reading
 * logs rather than blocks makes a wide window cheap, so this is generous.
 */
const MAX_CATCHUP = 600n
const MAX = 300

interface Scan { found: Payment[]; scanned: number }

/** Base produces a block every 2s, so a timestamp can be derived instead of fetched. */
const BLOCK_MS = 2_000
/** Transactions per round trip. Each response is about 1 KB. */
const TX_CHUNK = 6

async function scanRange(from: bigint, to: bigint, head: bigint, aborted: () => boolean): Promise<Scan> {
  const client = getClient('base')
  const scanned = Number(to - from + 1n)
  const logs = await client.getLogs({ address: USDC_BASE, event: AUTHORIZATION_USED, fromBlock: from, toBlock: to })
  if (aborted() || logs.length === 0) return { found: [], scanned }

  // One settlement can only come from one transaction, but a transaction may settle several.
  const byHash = new Map<Hex, { block: bigint; authorizer: string }>()
  for (const l of logs) {
    if (!byHash.has(l.transactionHash)) {
      byHash.set(l.transactionHash, { block: l.blockNumber, authorizer: String(l.args.authorizer).toLowerCase() })
    }
  }

  const nowAtHead = Date.now()
  const stamp = (block: bigint) => nowAtHead - Number(head - block) * BLOCK_MS

  const found: Payment[] = []
  const hashes = [...byHash.keys()]
  for (let i = 0; i < hashes.length; i += TX_CHUNK) {
    if (aborted()) break
    const batch = hashes.slice(i, i + TX_CHUNK)
    const txs = await Promise.all(batch.map((h) => client.getTransaction({ hash: h }).catch(() => null)))
    for (const tx of txs) {
      if (!tx) continue
      let decoded
      // A settlement routed through an aggregator does not decode as a bare EIP-3009 call;
      // its amount and recipient are not recoverable from the calldata, so it is left out.
      try { decoded = decodeFunctionData({ abi: ABI, data: tx.input }) } catch { continue }
      const units = decoded.args[2] as bigint
      const meta = byHash.get(tx.hash)!
      found.push({
        key: tx.hash, block: meta.block, tx: tx.hash,
        facilitator: tx.from.toLowerCase(),
        facilitatorName: FACILITATOR_BY_ADDR[tx.from.toLowerCase()] ?? null,
        payer: String(decoded.args[0]).toLowerCase(),
        payTo: String(decoded.args[1]).toLowerCase(),
        units, usdc: Number(formatUnits(units, 6)),
        ts: stamp(meta.block),
      })
    }
  }
  return { found, scanned }
}

export function usePayments() {
  const [state, setState] = useState<Omit<PaymentsState, 'senderCounts'>>({
    payments: [], head: null, blocksScanned: 0, error: null,
  })

  useEffect(() => {
    let stopped = false
    let running = false
    let cursor: bigint | null = null
    const client = getClient('base')

    const tick = async () => {
      // Single flight: a slow scan must not overlap the next interval.
      if (running || stopped) return
      running = true
      try {
        const head = await client.getBlockNumber()
        const wanted = cursor === null ? head - BACKFILL : cursor + 1n
        // Bounded catch-up: skip ahead rather than replaying a long gap.
        const from = head - wanted > MAX_CATCHUP ? head - MAX_CATCHUP : wanted
        if (from > head) { cursor = head; return }
        const { found, scanned } = await scanRange(from, head, head, () => stopped)
        if (stopped) return
        cursor = head
        setState((s) => {
          const seen = new Set(s.payments.map((p) => p.key))
          const fresh = found.filter((p) => !seen.has(p.key))
          return {
            payments: [...fresh, ...s.payments].sort((a, b) => b.ts - a.ts).slice(0, MAX),
            head, blocksScanned: s.blocksScanned + scanned, error: null,
          }
        })
      } catch (e) {
        if (!stopped) setState((s) => ({ ...s, error: errMessage(e) }))
      } finally {
        running = false
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => { stopped = true; clearInterval(id) }
  }, [])

  const senderCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of state.payments) c[p.facilitator] = (c[p.facilitator] ?? 0) + 1
    return c
  }, [state.payments])

  return { ...state, senderCounts }
}

/**
 * Rate over the retained window. Using the cumulative scanned-block count would decay once
 * older payments are evicted, because the elapsed time would keep growing while the count cannot.
 */
export function paymentsPerMinute(s: PaymentsState): number | null {
  if (s.payments.length < 2) return null
  const newest = s.payments[0].ts
  const oldest = s.payments[s.payments.length - 1].ts
  const minutes = (newest - oldest) / 60_000
  if (minutes < 0.5) return null
  return s.payments.length / minutes
}

/**
 * A facilitator's name when a public directory lists one, otherwise the address itself.
 * Labelling every unknown sender "Unnamed" repeated a word on every row and said nothing;
 * the address alone already shows that no name was found.
 */
export const facilitatorLabel = (p: Payment) => p.facilitatorName ?? short(p.facilitator)
