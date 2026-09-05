import { base, bsc, polygon, type Chain } from 'viem/chains'

export type ChainKey = 'base' | 'bnb' | 'polygon'

export interface ChainConfig {
  key: ChainKey
  label: string
  short: string
  chain: Chain
  rpcs: string[]
  /** Max eth_getLogs block range (measured, see docs/research/registry.md) */
  logRange: bigint
  explorer: string
}

const env = import.meta.env

export const CHAINS: Record<ChainKey, ChainConfig> = {
  base: {
    key: 'base', label: 'Base', short: 'BASE', chain: base,
    rpcs: [env.VITE_RPC_BASE ?? 'https://mainnet.base.org'],
    logRange: 10_000n, explorer: 'https://basescan.org',
  },
  bnb: {
    key: 'bnb', label: 'BNB Chain', short: 'BNB', chain: bsc,
    rpcs: [env.VITE_RPC_BNB ?? 'https://bsc-rpc.publicnode.com'],
    logRange: 5_000n, explorer: 'https://bscscan.com',
  },
  polygon: {
    key: 'polygon', label: 'Polygon', short: 'POL', chain: polygon,
    rpcs: [env.VITE_RPC_POLYGON ?? 'https://polygon-bor-rpc.publicnode.com', 'https://polygon.drpc.org'],
    logRange: 2_000n, explorer: 'https://polygonscan.com',
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
