import { useQuery } from '@tanstack/react-query'

/** Shape of public/snapshots/bazaar-market.json, written by scripts/bazaar-market.mjs. */
export interface Band { endpoints: number; calls: number; withCalls: number }
export interface Market {
  generatedAt: string
  totals: {
    reported: number; endpoints: number; sellers: number; calls30d: number; withCalls: number
    priced: number; medianUsd: number | null; top10Share: number | null
  }
  bands: Record<BandKey, Band>
  networks: { id: string; label: string; endpoints: number; calls: number }[]
  categories: { key: string; endpoints: number; calls: number }[]
  sellers: { host: string; endpoints: number; calls: number; maxPayers: number; medianUsd: number | null; networks: string[] }[]
  topEndpoints: { resource: string; method: string; name: string | null; host: string; usd: number | null; calls: number; payers: number | null; lastCalledAt: string | null; cat: string }[]
  curve: { rank: number; share: number }[]
  demand: { key: string; endpoints: number; calls: number }[]
  history: { date: string; endpoints: number; sellers: number; calls30d: number; withCalls: number }[]
}

export const BAND_KEYS = ['free', 'lt0001', 'lt001', 'lt01', 'lt1', 'gte1', 'unpriced'] as const
export type BandKey = (typeof BAND_KEYS)[number]

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const nOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** The file is CI output, but a changed shape must degrade to empty panels, not a crash. */
function normalize(raw: unknown): Market {
  const d = (raw ?? {}) as Record<string, never>
  const t = (d.totals ?? {}) as Record<string, never>
  const b = (d.bands ?? {}) as Record<string, Partial<Band>>
  return {
    generatedAt: typeof d.generatedAt === 'string' ? d.generatedAt : new Date(0).toISOString(),
    totals: {
      reported: n(t.reported), endpoints: n(t.endpoints), sellers: n(t.sellers), calls30d: n(t.calls30d),
      withCalls: n(t.withCalls), priced: n(t.priced), medianUsd: nOrNull(t.medianUsd), top10Share: nOrNull(t.top10Share),
    },
    bands: Object.fromEntries(BAND_KEYS.map((k) => [k, { endpoints: n(b[k]?.endpoints), calls: n(b[k]?.calls), withCalls: n(b[k]?.withCalls) }])) as Record<BandKey, Band>,
    networks: arr(d.networks), categories: arr(d.categories), sellers: arr(d.sellers),
    topEndpoints: arr(d.topEndpoints), curve: arr(d.curve), demand: arr(d.demand), history: arr(d.history),
  }
}

export const useMarket = () => useQuery<Market | null>({
  queryKey: ['bazaar-market'],
  queryFn: async () => {
    const r = await fetch(`${import.meta.env.BASE_URL}snapshots/bazaar-market.json`)
    if (!r.ok) return null
    return normalize(await r.json())
  },
  staleTime: 60 * 60_000,
})
