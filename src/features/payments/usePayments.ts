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
const SELECTORS = new Set(['0xe3ee160e', '0xcf092995', '0xef55bec6', '0x88b7ab63'])
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

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
const BACKFILL = 40n
/** Cap for a single catch-up so a backgrounded tab cannot ask for thousands of blocks at once. */
const MAX_CATCHUP = 60n
const CHUNK = 4n
const MAX = 300

interface Scan { found: Payment[]; scanned: number }

async function scanRange(from: bigint, to: bigint, aborted: () => boolean): Promise<Scan> {
  const client = getClient('base')
  const usdc = USDC_BASE.toLowerCase()

  // One log query per range tells us which transactions actually moved USDC. A reverted
  // authorization emits no Transfer, so this filters out failed settlements cheaply.
  const transfers = await client.getLogs({ address: USDC_BASE, event: TRANSFER, fromBlock: from, toBlock: to })
  const settled = new Set(transfers.map((l) => l.transactionHash))

  const found: Payment[] = []
  for (let b = from; b <= to; b += CHUNK) {
    if (aborted()) break
    const nums: bigint[] = []
    for (let n = b; n < b + CHUNK && n <= to; n++) nums.push(n)
    const blocks = await Promise.all(nums.map((n) => client.getBlock({ blockNumber: n, includeTransactions: true })))
    for (const blk of blocks) {
      for (const tx of blk.transactions) {
        if (typeof tx === 'string') continue
        if (tx.to?.toLowerCase() !== usdc) continue
        if (!SELECTORS.has(tx.input.slice(0, 10))) continue
        if (!settled.has(tx.hash)) continue
        let d
        try { d = decodeFunctionData({ abi: ABI, data: tx.input }) } catch { continue }
        const units = d.args[2] as bigint
        found.push({
          key: tx.hash, block: blk.number, tx: tx.hash,
          facilitator: tx.from.toLowerCase(),
          facilitatorName: FACILITATOR_BY_ADDR[tx.from.toLowerCase()] ?? null,
          payer: (d.args[0] as string).toLowerCase(),
          payTo: (d.args[1] as string).toLowerCase(),
          units, usdc: Number(formatUnits(units, 6)),
          ts: Number(blk.timestamp) * 1000,
        })
      }
    }
  }
  return { found, scanned: Number(to - from + 1n) }
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
        const { found, scanned } = await scanRange(from, head, () => stopped)
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
