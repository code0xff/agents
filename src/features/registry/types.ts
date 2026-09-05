import type { ChainKey } from '../../data/chains'

export interface RegistryEvent {
  key: string
  chain: ChainKey
  kind: 'registered' | 'uri'
  agentId: bigint
  owner: `0x${string}`
  uri: string
  name?: string
  description?: string
  x402?: boolean
  block: bigint
  tx: `0x${string}`
  ts: number // ms; block timestamp, or observation time when unknown
}
