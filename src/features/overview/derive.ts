import type { AgentEconomy } from '../marketplaces/useAggregates'

export interface Trend { pct: number; recent: number; prior: number }

/** Compares the last `w` days against the `w` days before them. Null when the series is too short. */
export function trend(values: number[], w = 7): Trend | null {
  if (values.length < w * 2) return null
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const recent = sum(values.slice(-w))
  const prior = sum(values.slice(-w * 2, -w))
  if (prior === 0) return null
  return { pct: ((recent - prior) / prior) * 100, recent, prior }
}

/**
 * Compares the last complete period against the one before it. The final entry of a monthly
 * series is the month in progress, so including it would compare a few days against a full month
 * and read as a collapse.
 */
export function periodTrend(values: number[]): Trend | null {
  if (values.length < 3) return null
  const recent = values[values.length - 2]
  const prior = values[values.length - 3]
  if (!prior) return null
  return { pct: ((recent - prior) / prior) * 100, recent, prior }
}

export interface Share { name: string; value: number; pct: number }

/** Source feeds already bucket their long tail under names like these. */
const OTHER_NAMES = new Set(['other', 'others', 'unknown', 'rest'])

export function shares(rows: { name: string; value: number }[], keep = 5): Share[] {
  const total = rows.reduce((a, r) => a + r.value, 0)
  if (!total) return []
  // Fold any pre-existing "Other" bucket into ours so the chart never shows both.
  const named = rows.filter((r) => !OTHER_NAMES.has(r.name.trim().toLowerCase()))
  let rest = rows.filter((r) => OTHER_NAMES.has(r.name.trim().toLowerCase())).reduce((a, r) => a + r.value, 0)
  const sorted = [...named].sort((a, b) => b.value - a.value)
  rest += sorted.slice(keep).reduce((a, r) => a + r.value, 0)
  const out = sorted.slice(0, keep).map((r) => ({ ...r, pct: (r.value / total) * 100 }))
  if (rest > 0) out.push({ name: '__others__', value: rest, pct: (rest / total) * 100 })
  return out
}

export const facilitatorShares = (d: AgentEconomy | undefined) =>
  d ? shares(d.x402.protocols.map((p) => ({ name: p.name, value: p.share })), 5) : []

export const agentChainShares = (d: AgentEconomy | undefined) =>
  d ? shares(d.erc8004Registry.chains.map((c) => ({ name: c.name, value: c.agents })), 5) : []

/** Which chains x402 payments actually run on. The headline total spans all of them. */
export const paymentChainShares = (d: AgentEconomy | undefined) =>
  d ? shares(d.x402.chains.map((c) => ({ name: c.name, value: c.txs })), 5) : []
