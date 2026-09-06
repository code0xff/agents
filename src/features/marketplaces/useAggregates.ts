import { useQuery } from '@tanstack/react-query'

export interface AgentEconomy {
  updatedAt: string
  x402: { totalTxs: number; totalVolume: number; facilitatorsTracked: number; asOf?: string; chainsAsOf?: string; monthly: { month: string; txs: number; vol: number }[]; daily: { day: string; txs: number }[]; protocols: { name: string; share: number }[]; chains: { name: string; txs: number }[]; tokenSplit?: { usdcSharePct: number; windowDays: number } }
  erc8004Registry: { totalAgents: number; chainsTracked: number; chains: { name: string; agents: number }[]; daily: { day: string; agents: number }[] }
  virtualsAcp: { totalMemos: number; daily: { day: string; memos: number }[] }
  olas: { totalTxs: number; weekly: { week: string; txs: number }[] }
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const numOr = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/**
 * The generic argument is a compile-time claim only. A 200 response with a changed shape would
 * otherwise reach components and throw on `.map`, so every field used downstream is normalized here.
 */
function normalizeAgentEconomy(raw: unknown): AgentEconomy {
  const d = (raw ?? {}) as Record<string, never>
  const x = (d.x402 ?? {}) as Record<string, never>
  const reg = (d.erc8004Registry ?? {}) as Record<string, never>
  const acp = (d.virtualsAcp ?? {}) as Record<string, never>
  const olas = (d.olas ?? {}) as Record<string, never>
  const split = x.tokenSplit as { usdcSharePct?: number; windowDays?: number } | undefined
  return {
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
    x402: {
      totalTxs: numOr(x.totalTxs), totalVolume: numOr(x.totalVolume),
      facilitatorsTracked: numOr(x.facilitatorsTracked),
      // The chain split is refreshed on its own schedule and runs well behind the totals.
      asOf: typeof x.asOf === 'string' ? x.asOf : undefined,
      chainsAsOf: typeof x.chainsAsOf === 'string' ? x.chainsAsOf : undefined,
      monthly: arr<{ month: string; txs: number; vol: number }>(x.monthly),
      daily: arr<{ day: string; txs: number }>(x.daily),
      protocols: arr<{ name: string; share: number }>(x.protocols),
      chains: arr<{ name: string; txs: number }>(x.chains),
      tokenSplit: split && typeof split.usdcSharePct === 'number'
        ? { usdcSharePct: split.usdcSharePct, windowDays: numOr(split.windowDays) } : undefined,
    },
    erc8004Registry: {
      totalAgents: numOr(reg.totalAgents), chainsTracked: numOr(reg.chainsTracked),
      chains: arr<{ name: string; agents: number }>(reg.chains),
      daily: arr<{ day: string; agents: number }>(reg.daily),
    },
    virtualsAcp: { totalMemos: numOr(acp.totalMemos), daily: arr<{ day: string; memos: number }>(acp.daily) },
    olas: { totalTxs: numOr(olas.totalTxs), weekly: arr<{ week: string; txs: number }>(olas.weekly) },
  }
}

export const useAgentEconomy = () => useQuery<AgentEconomy>({
  queryKey: ['agenteconomy'],
  queryFn: async () => {
    const r = await fetch('https://dashboard.agenteconomy.to/data.json')
    if (!r.ok) throw new Error(String(r.status))
    return normalizeAgentEconomy(await r.json())
  },
  staleTime: 30 * 60_000,
})

export interface OcaiStats { agents_indexed: number; mcp_agents: number; openapi_agents: number; chains_breakdown: Record<string, number> }
export const useOcaiStats = () => useQuery<OcaiStats>({
  queryKey: ['ocai-stats'],
  queryFn: async () => {
    const r = await fetch('https://api.onchainagentintel.io/v1/public/stats')
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as Partial<OcaiStats>
    return {
      agents_indexed: numOr(j.agents_indexed), mcp_agents: numOr(j.mcp_agents),
      openapi_agents: numOr(j.openapi_agents), chains_breakdown: j.chains_breakdown ?? {},
    }
  },
  staleTime: 30 * 60_000,
})

/** CI snapshot (public/snapshots/*.json). Null when the file is missing. */
export interface Snapshot { generatedAt: string; total: number; added24h?: number; items: SnapshotItem[]; networks?: Record<string, number>; stats?: { total: number; active: number; networks: number } | null }
export interface SnapshotItem { name: string; url?: string; network?: string; price?: string; updated?: string; addedAt?: string }
export const useSnapshot = (name: string | undefined) => useQuery<Snapshot | null>({
  queryKey: ['snapshot', name],
  enabled: !!name,
  queryFn: async () => {
    const r = await fetch(`${import.meta.env.BASE_URL}snapshots/${name}.json`)
    if (!r.ok) return null
    const j = (await r.json()) as Partial<Snapshot>
    return {
      generatedAt: typeof j.generatedAt === 'string' ? j.generatedAt : new Date(0).toISOString(),
      total: numOr(j.total), added24h: numOr(j.added24h),
      items: arr<SnapshotItem>(j.items), networks: j.networks, stats: j.stats ?? null,
    }
  },
  staleTime: 60 * 60_000,
})
