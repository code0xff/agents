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
  ts: number // ms, 블록 타임스탬프 없으면 관측 시각
}
