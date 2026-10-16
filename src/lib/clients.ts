import { createPublicClient, fallback, http, type PublicClient } from 'viem'
import { CHAINS, type ChainKey } from '../data/chains'

const cache = new Map<ChainKey, PublicClient>()

/** All of a chain's endpoints behind viem's fallback, for single calls (head, transactions). */
export function getClient(key: ChainKey): PublicClient {
  let c = cache.get(key)
  if (!c) {
    const cfg = CHAINS[key]
    c = createPublicClient({
      chain: cfg.chain,
      transport: fallback(cfg.rpcs.map((r) => http(r.url, { timeout: 15_000, retryCount: 1 }))),
    })
    cache.set(key, c)
  }
  return c
}

/** How long an endpoint is skipped after refusing a log read for any reason but range. */
const COOLDOWN_MS = 60_000

interface Endpoint { url: string; chunk: bigint; client: PublicClient; until: number }

const endpoints = new Map<ChainKey, Endpoint[]>()

function endpointsFor(key: ChainKey): Endpoint[] {
  let list = endpoints.get(key)
  if (!list) {
    const cfg = CHAINS[key]
    list = cfg.rpcs.map((r) => ({
      url: r.url, chunk: r.logChunk, until: 0,
      // No retry here: a refusal moves to the next endpoint instead of asking this one again.
      client: createPublicClient({ chain: cfg.chain, transport: http(r.url, { timeout: 15_000, retryCount: 0 }) }),
    }))
    endpoints.set(key, list)
  }
  return list
}

/** Extracts N from "eth_getLogs is limited to a N range" and similar wordings, if present. */
function rangeLimit(e: unknown): bigint | undefined {
  // viem puts the RPC's own wording below the first line of its message, so read all of it.
  const m = /limited to an? ([\d,]+)(?: blocks?)? range/i.exec(e instanceof Error ? e.message : String(e))
  return m ? BigInt(m[1].replace(/,/g, '')) : undefined
}

/**
 * Reads `from`..`to` in chunks, rotating through the chain's endpoints.
 *
 * Public RPCs change terms without notice: mainnet.base.org cut its eth_getLogs range from
 * 10,000 to 2,000 to 500 blocks, then began answering 429 to every call. Each endpoint carries its
 * own chunk size, so a chunk is cut to fit whichever endpoint reads it. A refusal that names a
 * range limit shrinks that endpoint's chunk and retries it; any other failure puts the endpoint on
 * a cooldown and moves to the next. Only when every endpoint fails one chunk does the read fail.
 *
 * `onChunk` receives each chunk as it lands, so a failure part-way keeps what was already read.
 */
export async function readLogChunks<T>(
  key: ChainKey, from: bigint, to: bigint,
  read: (client: PublicClient, lo: bigint, hi: bigint) => Promise<T>,
  onChunk: (result: T, reached: bigint) => void,
): Promise<void> {
  const list = endpointsFor(key)
  let lo = from
  while (lo <= to) {
    const now = Date.now()
    const ready = list.filter((e) => e.until <= now)
    // Every endpoint cooling down: try them all anyway rather than reporting nothing.
    const order = ready.length > 0 ? ready : list
    let lastError: unknown
    let done = false
    for (const ep of order) {
      const hi = lo + ep.chunk > to ? to : lo + ep.chunk
      try {
        const result = await read(ep.client, lo, hi)
        onChunk(result, hi)
        lo = hi + 1n
        done = true
        break
      } catch (e) {
        lastError = e
        const limit = rangeLimit(e)
        if (limit !== undefined && limit > 0n && limit < ep.chunk) {
          // Shrunk, not failed: this endpoint gets the same chunk again at its new size.
          ep.chunk = limit
          done = true
          break
        }
        ep.until = Date.now() + COOLDOWN_MS
      }
    }
    if (!done) throw lastError
  }
}

/** `readLogChunks` collected into one array, for callers that want the whole range at once. */
export async function readLogs<T>(
  key: ChainKey, from: bigint, to: bigint,
  read: (client: PublicClient, lo: bigint, hi: bigint) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = []
  await readLogChunks(key, from, to, read, (r) => { out.push(...r) })
  return out
}
