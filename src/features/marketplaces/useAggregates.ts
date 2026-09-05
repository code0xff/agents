import { useQuery } from '@tanstack/react-query'

export interface AgentEconomy {
  updatedAt: string
  x402: { totalTxs: number; totalVolume: number; facilitatorsTracked: number; daily: { day: string; txs: number }[]; protocols: { name: string; share: number }[]; chains: { name: string; txs: number }[] }
  erc8004Registry: { totalAgents: number; chainsTracked: number; chains: { name: string; agents: number }[]; daily: { day: string; agents: number }[] }
  virtualsAcp: { totalMemos: number; daily: { day: string; memos: number }[] }
  olas: { totalTxs: number; weekly: { week: string; txs: number }[] }
}

export const useAgentEconomy = () => useQuery<AgentEconomy>({
  queryKey: ['agenteconomy'],
  queryFn: async () => { const r = await fetch('https://dashboard.agenteconomy.to/data.json'); if (!r.ok) throw new Error(String(r.status)); return r.json() },
  staleTime: 30 * 60_000,
})

export interface OcaiStats { agents_indexed: number; mcp_agents: number; openapi_agents: number; chains_breakdown: Record<string, number> }
export const useOcaiStats = () => useQuery<OcaiStats>({
  queryKey: ['ocai-stats'],
  queryFn: async () => { const r = await fetch('https://api.onchainagentintel.io/v1/public/stats'); if (!r.ok) throw new Error(String(r.status)); return r.json() },
  staleTime: 30 * 60_000,
})

/** CI snapshot (public/snapshots/*.json). Null when the file is missing. */
export interface Snapshot { generatedAt: string; total: number; added24h?: number; items: SnapshotItem[]; networks?: Record<string, number>; stats?: { total: number; active: number; networks: number } | null }
export interface SnapshotItem { name: string; url?: string; network?: string; price?: string; updated?: string; addedAt?: string }
export const useSnapshot = (name: string | undefined) => useQuery<Snapshot | null>({
  queryKey: ['snapshot', name],
  enabled: !!name,
  queryFn: async () => { const r = await fetch(`${import.meta.env.BASE_URL}snapshots/${name}.json`); if (!r.ok) return null; return r.json() },
  staleTime: 60 * 60_000,
})
