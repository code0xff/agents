import { base, bsc, mainnet, type Chain } from 'viem/chains'

export type ChainKey = 'base' | 'ethereum' | 'bnb'

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
  ethereum: {
    key: 'ethereum', label: 'Ethereum', short: 'ETH', chain: mainnet,
    rpcs: [env.VITE_RPC_ETHEREUM ?? 'https://gateway.tenderly.co/public/mainnet', 'https://rpc.mevblocker.io'],
    logRange: 10_000n, explorer: 'https://etherscan.io',
  },
  bnb: {
    key: 'bnb', label: 'BNB Chain', short: 'BNB', chain: bsc,
    rpcs: [env.VITE_RPC_BNB ?? 'https://bsc-rpc.publicnode.com'],
    logRange: 5_000n, explorer: 'https://bscscan.com',
  },
}

export const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
