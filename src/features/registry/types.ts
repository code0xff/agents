import type { ChainKey } from '../../data/chains'

export interface RegistryEvent {
  key: string
  chain: ChainKey
  kind: 'registered' | 'uri'
  agentId: bigint
  /** Who emitted the event: the owner for a registration, the updater for a URI change. */
  actor: `0x${string}`
  uri: string
  name?: string
  description?: string
  x402?: boolean
  block: bigint
  tx: `0x${string}`
  ts: number // ms; block timestamp, or observation time when unknown
}
