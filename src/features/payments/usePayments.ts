import { useEffect, useMemo, useState } from 'react'
import { decodeFunctionData, formatUnits, parseAbi, parseAbiItem, type Hex } from 'viem'
import { PAYMENT_CHAINS, PAYMENT_CHAIN_KEYS, type PaymentChainKey } from '../../data/chains'
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

/** Facilitator names per chain; the same operator uses different addresses on each. */
const FACILITATOR_BY_ADDR: Record<PaymentChainKey, Record<string, string>> = { base: {}, polygon: {} }
for (const f of facilitators) {
  for (const a of f.networks.base ?? []) FACILITATOR_BY_ADDR.base[a.toLowerCase()] = f.name
  for (const a of (f.networks as { polygon?: string[] }).polygon ?? []) FACILITATOR_BY_ADDR.polygon[a.toLowerCase()] = f.name
}

export interface Payment {
  key: string
  chain: PaymentChainKey
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
  /**
   * Timestamps of every settlement seen in the logs, newest first. Kept apart from `payments`
   * because a rate needs only a count and a span, both of which the logs already carry: it can
   * be published before any transaction is fetched, and it is not truncated by the per-scan
   * fetch cap the way the decoded list is.
   */
  beats: number[]
  heads: Partial<Record<PaymentChainKey, bigint>>
  blocksScanned: number
  errors: Partial<Record<PaymentChainKey, string>>
  /** Derived from the retained window, so it never counts evicted rows. */
  senderCounts: Record<string, number>
}

const POLL_MS = 10_000
/**
 * Retained per chain, not across both. A shared cap let Polygon, which settles roughly four times
 * as often, crowd Base out of the buffer: selecting Base showed about a minute of history where its
 * own backfill covers five.
 */
const MAX_PER_CHAIN = 200
/** Transactions per round trip. Each response is about 1 KB. */
const TX_CHUNK = 8
/**
 * Upper bound on transactions read in one scan. Polygon settles roughly four times per block,
 * so an untrimmed backfill would fetch far more than the retained window can hold.
 */
const MAX_TX_PER_SCAN = 60
/** Settlement timestamps retained for the rate. */
const MAX_BEATS = 1_200

interface Scan { found: Payment[]; scanned: number }

async function scanRange(
  key: PaymentChainKey, from: bigint, to: bigint, head: bigint, aborted: () => boolean,
  onBeats: (beats: number[]) => void,
): Promise<Scan> {
  const cfg = PAYMENT_CHAINS[key]
  const client = getClient(key)
  const scanned = Number(to - from + 1n)
  const logs = await client.getLogs({ address: cfg.usdc, event: AUTHORIZATION_USED, fromBlock: from, toBlock: to })
  if (aborted()) return { found: [], scanned }

  // Every log is one settlement. Publish their times now; the transactions only add detail.
  const nowForBeats = Date.now()
  onBeats(logs.map((l) => nowForBeats - Number(head - l.blockNumber) * cfg.blockSeconds * 1000))
  if (logs.length === 0) return { found: [], scanned }

  // One transaction may settle several authorisations, so collapse by hash, newest first,
  // and read only as many as the retained window can use.
  const byHash = new Map<Hex, bigint>()
  for (let i = logs.length - 1; i >= 0; i--) {
    const l = logs[i]
    if (!byHash.has(l.transactionHash)) byHash.set(l.transactionHash, l.blockNumber)
    if (byHash.size >= MAX_TX_PER_SCAN) break
  }

  const nowAtHead = Date.now()
  const stamp = (block: bigint) => nowAtHead - Number(head - block) * cfg.blockSeconds * 1000

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
      const block = byHash.get(tx.hash)!
      const from = tx.from.toLowerCase()
      found.push({
        key: `${key}:${tx.hash}`, chain: key, block, tx: tx.hash,
        facilitator: from,
        facilitatorName: FACILITATOR_BY_ADDR[key][from] ?? null,
        payer: String(decoded.args[0]).toLowerCase(),
        payTo: String(decoded.args[1]).toLowerCase(),
        units, usdc: Number(formatUnits(units, 6)),
        ts: stamp(block),
      })
    }
  }
  return { found, scanned }
}

export function usePayments() {
  const [state, setState] = useState<Omit<PaymentsState, 'senderCounts'>>({
    payments: [], beats: [], heads: {}, blocksScanned: 0, errors: {},
  })

  useEffect(() => {
    let stopped = false
    let running = false
    const cursors: Partial<Record<PaymentChainKey, bigint>> = {}

    const tick = async () => {
      // Single flight: a slow scan must not overlap the next interval.
      if (running || stopped) return
      running = true
      try {
        await Promise.all(PAYMENT_CHAIN_KEYS.map(async (key) => {
          const cfg = PAYMENT_CHAINS[key]
          try {
            const client = getClient(key)
            const head = await client.getBlockNumber()
            const cursor = cursors[key]
            const wanted = cursor === undefined ? head - cfg.backfill : cursor + 1n
            // Bounded catch-up: skip ahead rather than replaying a long gap.
            const from = head - wanted > cfg.maxCatchup ? head - cfg.maxCatchup : wanted
            if (from > head) { cursors[key] = head; return }
            const { found, scanned } = await scanRange(key, from, head, head, () => stopped, (beats) => {
              if (stopped || beats.length === 0) return
              setState((s) => ({
                ...s,
                beats: [...beats, ...s.beats].sort((a, b) => b - a).slice(0, MAX_BEATS),
                heads: { ...s.heads, [key]: head },
              }))
            })
            if (stopped) return
            cursors[key] = head
            setState((s) => {
              const seen = new Set(s.payments.map((p) => p.key))
              const fresh = found.filter((p) => !seen.has(p.key))
              const merged = [...fresh, ...s.payments].sort((a, b) => b.ts - a.ts)
              const perChain: Partial<Record<PaymentChainKey, number>> = {}
              return {
                ...s,
                payments: merged.filter((p) => {
                  const n = (perChain[p.chain] ?? 0) + 1
                  perChain[p.chain] = n
                  return n <= MAX_PER_CHAIN
                }),
                heads: { ...s.heads, [key]: head },
                blocksScanned: s.blocksScanned + scanned,
                errors: { ...s.errors, [key]: undefined },
              }
            })
          } catch (e) {
            if (!stopped) setState((s) => ({ ...s, errors: { ...s.errors, [key]: errMessage(e) } }))
          }
        }))
      } finally {
        running = false
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => { stopped = true; clearInterval(id) }
  }, [])

  // Keyed by chain and address: the same operator uses different addresses per chain.
  const senderCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of state.payments) { const k = `${p.chain}:${p.facilitator}`; c[k] = (c[k] ?? 0) + 1 }
    return c
  }, [state.payments])

  return { ...state, senderCounts }
}

/**
 * Rate over the retained window. Using the cumulative scanned-block count would decay once
 * older payments are evicted, because the elapsed time would keep growing while the count cannot.
 */
/**
 * Rate over the retained beats. Reading it from the logs rather than the decoded payments makes
 * it appear as soon as the first log query returns, and counts every settlement in range rather
 * than the subset whose transactions were fetched.
 */
export function paymentsPerMinute(s: PaymentsState): number | null {
  if (s.beats.length < 2) return null
  const minutes = (s.beats[0] - s.beats[s.beats.length - 1]) / 60_000
  if (minutes < 0.5) return null
  return s.beats.length / minutes
}

/**
 * Always the address. One operator runs many addresses, so printing its name on every row
 * repeats a word that distinguishes nothing while hiding the one thing that does. The
 * operator name is still carried on the payment and shown on hover.
 */
export const facilitatorLabel = (p: Payment) => short(p.facilitator)
