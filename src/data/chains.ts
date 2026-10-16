import { base, bsc, polygon, type Chain } from 'viem/chains'

export type ChainKey = 'base' | 'bnb' | 'polygon'

/** One public endpoint and the widest eth_getLogs range (`toBlock - fromBlock`) it answers. */
export interface Rpc {
  url: string
  /** Measured, and measured again whenever a chain stops answering. See `docs/research/registry.md`. */
  logChunk: bigint
}

export interface ChainConfig {
  key: ChainKey
  label: string
  short: string
  chain: Chain
  /**
   * Keyless endpoints in order of preference. Log reads rotate through them (`readLogChunks`):
   * public RPCs cut limits and rate-limit without notice, so no single one is trusted.
   */
  rpcs: Rpc[]
  /** Blocks read on first load, and the furthest back a catch-up may reach. */
  logWindow: bigint
  explorer: string
}

const env = import.meta.env

export const CHAINS: Record<ChainKey, ChainConfig> = {
  base: {
    key: 'base', label: 'Base', short: 'BASE', chain: base,
    // mainnet.base.org 429s eth_getLogs; publicnode serves logs only within ~10,000 blocks of
    // head without an archive token, which bounds the window.
    rpcs: [
      { url: env.VITE_RPC_BASE ?? 'https://base-rpc.publicnode.com', logChunk: 5_000n },
      { url: 'https://base.gateway.tenderly.co', logChunk: 500n },
      { url: 'https://mainnet.base.org', logChunk: 500n },
    ],
    logWindow: 8_000n, explorer: 'https://basescan.org',
  },
  bnb: {
    key: 'bnb', label: 'BNB Chain', short: 'BNB', chain: bsc,
    rpcs: [{ url: env.VITE_RPC_BNB ?? 'https://bsc-rpc.publicnode.com', logChunk: 5_000n }],
    logWindow: 5_000n, explorer: 'https://bscscan.com',
  },
  polygon: {
    key: 'polygon', label: 'Polygon', short: 'POL', chain: polygon,
    rpcs: [
      { url: env.VITE_RPC_POLYGON ?? 'https://polygon-bor-rpc.publicnode.com', logChunk: 2_000n },
      { url: 'https://polygon.drpc.org', logChunk: 2_000n },
    ],
    logWindow: 2_000n, explorer: 'https://polygonscan.com',
  },
}

export const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const

export type PaymentChainKey = 'base' | 'polygon'

interface PaymentChain {
  key: PaymentChainKey
  /** The USDC contract settlements run through. Polygon's bridged USDC.e carries none. */
  usdc: `0x${string}`
  /** Seconds per block, used to date a settlement without fetching its block header. */
  blockSeconds: number
  /** Blocks read on first load. Polygon settles far more often, so its window is shorter. */
  backfill: bigint
  /** Upper bound for a single catch-up, so a backgrounded tab cannot ask for an open range. */
  maxCatchup: bigint
}

export const PAYMENT_CHAINS: Record<PaymentChainKey, PaymentChain> = {
  base: { key: 'base', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', blockSeconds: 2, backfill: 150n, maxCatchup: 600n },
  polygon: { key: 'polygon', usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', blockSeconds: 2, backfill: 40n, maxCatchup: 200n },
}

export const PAYMENT_CHAIN_KEYS = Object.keys(PAYMENT_CHAINS) as PaymentChainKey[]
