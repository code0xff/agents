import { useEffect, useRef, useState } from 'react'
import { decodeFunctionData, formatUnits, parseAbi, type Hex } from 'viem'
import { USDC_BASE } from '../../data/chains'
import facilitators from '../../data/facilitators.json'
import { getClient } from '../../lib/clients'
import type { Translate } from '../../i18n'

const ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
])
const SELECTORS = new Set(['0xe3ee160e', '0xcf092995', '0xef55bec6', '0x88b7ab63'])

export const FACILITATOR_BY_ADDR: Record<string, string> = {}
for (const f of facilitators) for (const a of f.networks.base ?? []) FACILITATOR_BY_ADDR[a.toLowerCase()] = f.name

export interface Payment {
  key: string
  block: bigint
  tx: Hex
  facilitator: string   // address
  facilitatorName: string | null
  payer: string
  payTo: string
  usdc: number
  ts: number
}

export interface PaymentsState {
  payments: Payment[]
  head: bigint | null
  blocksScanned: number
  error: string | null
  senderCounts: Record<string, number>
}

const POLL_MS = 10_000
const BACKFILL = 40n
const MAX = 300
const UNLABELED_PROMOTE = 3

export function usePayments() {
  const [state, setState] = useState<PaymentsState>({ payments: [], head: null, blocksScanned: 0, error: null, senderCounts: {} })
  const cursor = useRef<bigint | null>(null)
  const counts = useRef<Record<string, number>>({})

  useEffect(() => {
    let stop = false
    const client = getClient('base')
    const scan = async (from: bigint, to: bigint) => {
      const found: Payment[] = []
      const nums: bigint[] = []
      for (let b = from; b <= to; b++) nums.push(b)
      // Fetch four blocks in parallel
      for (let i = 0; i < nums.length; i += 4) {
        const chunk = nums.slice(i, i + 4)
        const blocks = await Promise.all(chunk.map((n) => client.getBlock({ blockNumber: n, includeTransactions: true })))
        for (const blk of blocks) {
          for (const tx of blk.transactions) {
            if (typeof tx === 'string') continue
            if (tx.to?.toLowerCase() !== USDC_BASE.toLowerCase()) continue
            if (!SELECTORS.has(tx.input.slice(0, 10))) continue
            let d
            try { d = decodeFunctionData({ abi: ABI, data: tx.input }) } catch { continue }
            const fac = tx.from.toLowerCase()
            counts.current[fac] = (counts.current[fac] ?? 0) + 1
            found.push({
              key: tx.hash, block: blk.number, tx: tx.hash, facilitator: fac,
              facilitatorName: FACILITATOR_BY_ADDR[fac] ?? null,
              payer: (d.args[0] as string).toLowerCase(), payTo: (d.args[1] as string).toLowerCase(),
              usdc: Number(formatUnits(d.args[2] as bigint, 6)), ts: Number(blk.timestamp) * 1000,
            })
          }
        }
        if (stop) return found
      }
      return found
    }
    const push = (found: Payment[], head: bigint, n: number) => setState((s) => {
      const seen = new Set(s.payments.map((p) => p.key))
      const fresh = found.filter((p) => !seen.has(p.key))
      return { ...s, payments: [...fresh, ...s.payments].sort((a, b) => b.ts - a.ts).slice(0, MAX), head, blocksScanned: s.blocksScanned + n, error: null, senderCounts: { ...counts.current } }
    })
    const run = async () => {
      try {
        const head = await client.getBlockNumber()
        const from = cursor.current == null ? head - BACKFILL : cursor.current + 1n
        if (head < from) return
        const to = head
        const found = await scan(from, to)
        cursor.current = to
        if (!stop) push(found, to, Number(to - from + 1n))
      } catch (e) { if (!stop) setState((s) => ({ ...s, error: (e as Error).message.split('\n')[0] })) }
    }
    run()
    const id = setInterval(run, POLL_MS)
    return () => { stop = true; clearInterval(id) }
  }, [])

  return state
}

export const facilitatorLabel = (p: Payment, counts: Record<string, number>, t: Translate) =>
  p.facilitatorName ?? ((counts[p.facilitator] ?? 0) >= UNLABELED_PROMOTE ? t('pay.unlabeled', { id: p.facilitator.slice(2, 6) }) : null)
