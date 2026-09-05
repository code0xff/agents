import { createPublicClient, fallback, http, type PublicClient } from 'viem'
import { CHAINS, type ChainKey } from '../data/chains'

const cache = new Map<ChainKey, PublicClient>()

export function getClient(key: ChainKey): PublicClient {
  let c = cache.get(key)
  if (!c) {
    const cfg = CHAINS[key]
    c = createPublicClient({
      chain: cfg.chain,
      transport: fallback(cfg.rpcs.map((u) => http(u, { timeout: 15_000, retryCount: 1 }))),
    })
    cache.set(key, c)
  }
  return c
}
