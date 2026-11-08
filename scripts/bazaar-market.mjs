// Aggregates the CDP Bazaar catalog into a small market summary for the #/bazaar route.
// The raw catalog is tens of MB, so only aggregates ship to the browser. See docs/research/bazaar.md.

// USDC contracts by network (lower-cased). Only these are converted to USD, at 6 decimals.
const USDC = new Set([
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e', // Base Sepolia
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // Polygon
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'.toLowerCase(), // Solana
])

// Legacy network names → CAIP-2, so one network is not split across two spellings.
const NET_ALIAS = {
  base: 'eip155:8453', 'base-sepolia': 'eip155:84532', polygon: 'eip155:137',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'solana-devnet': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
}
const NET_LABEL = {
  'eip155:8453': 'Base', 'eip155:84532': 'Base Sepolia', 'eip155:137': 'Polygon', 'eip155:56': 'BNB',
  'eip155:42161': 'Arbitrum', 'eip155:42220': 'Celo', 'eip155:196': 'X Layer', 'eip155:8217': 'Kaia',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'Solana', 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'Solana Devnet',
  'xrpl:0': 'XRPL', 'eip155:1': 'Ethereum', 'eip155:10': 'Optimism', 'eip155:143': 'Monad', 'eip155:5042': 'Arc', 'eip155:480': 'World Chain', 'eip155:43114': 'Avalanche',
}
const netId = (n) => NET_ALIAS[String(n ?? '').toLowerCase()] ?? String(n ?? 'unknown')

// Category estimate: first match wins, word-bounded so "price" or "rate" alone does not mean finance.
// Keys are translated in the UI (bazaar.cat.*).
const CATS = [
  ['compliance', /\b(sanctions?|ofac|kyc|aml|compliance|fraud)\b/],
  ['weather', /\b(weather|climate|forecast)\b/],
  ['finance', /\b(stocks?|equit(y|ies)|forex|fx|bonds?|earnings|sec filings?|interest rates?|exchange rates?)\b/],
  ['crypto', /\b(tokens?|defi|on-?chain|blockchain|wallets?|nfts?|dex|swaps?|solana|ethereum|memecoins?)\b/],
  ['search', /\b(search|scrap(e|ing)|crawl(er|ing)?|screenshots?|serp|web ?pages?)\b/],
  ['media', /\b(images?|video|audio|music|tts|speech|voice)\b/],
  ['ai', /\b(llm|gpt|inference|embeddings?|chatbot|translat(e|ion)|summari[sz](e|ation)|ai|agents?)\b/],
  ['data', /\b(data(set)?|analytics|reports?|lookup)\b/],
]
function category(it) {
  let p = ''; try { p = new URL(it.resource).pathname.replace(/[/_-]+/g, ' ') } catch {}
  const s = [it.serviceName, ...(Array.isArray(it.tags) ? it.tags : []), it.description, p].filter(Boolean).join(' ').toLowerCase()
  for (const [k, re] of CATS) if (re.test(s)) return k
  return 'other'
}

const BANDS = [
  ['free', (v) => v === 0], ['lt0001', (v) => v <= 0.001], ['lt001', (v) => v <= 0.01],
  ['lt01', (v) => v <= 0.1], ['lt1', (v) => v <= 1], ['gte1', () => true],
]
const band = (usd) => (usd == null ? 'unpriced' : BANDS.find(([, f]) => f(usd))[0])
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Reduces one raw catalog entry to what the aggregates need. Returns null for unusable entries. */
export function compact(it) {
  let host
  try { const u = new URL(it.resource); if (!/^https?:$/.test(u.protocol)) return null; host = u.hostname.toLowerCase() } catch { return null }
  const accepts = Array.isArray(it.accepts) ? it.accepts : []
  const prices = accepts
    .filter((a) => USDC.has(String(a.asset ?? '').toLowerCase()))
    .map((a) => Number(a.amount ?? a.maxAmountRequired) / 1e6)
    .filter((v) => Number.isFinite(v) && v >= 0)
  const q = it.quality ?? {}
  return {
    resource: it.resource,
    method: it.extensions?.bazaar?.info?.input?.method ?? 'GET',
    name: String(it.serviceName || '').slice(0, 80) || null,
    host,
    networks: [...new Set(accepts.map((a) => netId(a.network)))],
    usd: prices.length ? Math.min(...prices) : null,
    calls: num(q.l30DaysTotalCalls),
    payers: num(q.l30DaysUniquePayers),
    lastCalledAt: q.lastCalledAt ?? null,
    cat: category(it),
  }
}

/** Builds the market document. `rows` are compact() results; `reported` is pagination.total. */
export function market(rows, reported, now, history) {
  // URL + method is one endpoint; keep the copy that carries a demand figure.
  const uniq = new Map()
  for (const r of rows) {
    const k = `${r.method} ${r.resource}`, prev = uniq.get(k)
    if (!prev || (prev.calls == null && r.calls != null)) uniq.set(k, r)
  }
  const eps = [...uniq.values()]
  const calls = (r) => r.calls ?? 0
  const totalCalls = eps.reduce((s, r) => s + calls(r), 0)

  const bands = Object.fromEntries([...BANDS.map(([k]) => k), 'unpriced'].map((k) => [k, { endpoints: 0, calls: 0, withCalls: 0 }]))
  const networks = {}, cats = {}, sellers = new Map()
  for (const r of eps) {
    const b = bands[band(r.usd)]; b.endpoints++; b.calls += calls(r); if (calls(r) > 0) b.withCalls++
    for (const n of r.networks) {
      const e = (networks[n] ??= { label: NET_LABEL[n] ?? n, endpoints: 0, calls: 0 })
      e.endpoints++; e.calls += calls(r)
    }
    const c = (cats[r.cat] ??= { endpoints: 0, calls: 0 }); c.endpoints++; c.calls += calls(r)
    const s = sellers.get(r.host) ?? { host: r.host, endpoints: 0, calls: 0, maxPayers: 0, prices: [], networks: new Set() }
    s.endpoints++; s.calls += calls(r); s.maxPayers = Math.max(s.maxPayers, r.payers ?? 0)
    if (r.usd != null) s.prices.push(r.usd)
    r.networks.forEach((n) => s.networks.add(NET_LABEL[n] ?? n))
    sellers.set(r.host, s)
  }

  const sellerRows = [...sellers.values()]
    .sort((a, b) => b.calls - a.calls || b.endpoints - a.endpoints)
    .map((s) => ({ host: s.host, endpoints: s.endpoints, calls: s.calls, maxPayers: s.maxPayers, medianUsd: median(s.prices), networks: [...s.networks].slice(0, 4) }))
  const top10 = sellerRows.slice(0, 10).reduce((a, s) => a + s.calls, 0)
  const priced = eps.filter((r) => r.usd != null).map((r) => r.usd)

  return {
    generatedAt: now,
    source: 'Coinbase CDP Bazaar Discovery',
    totals: {
      reported, endpoints: eps.length, sellers: sellers.size, calls30d: totalCalls,
      withCalls: eps.filter((r) => calls(r) > 0).length, priced: priced.length, medianUsd: median(priced),
      top10Share: totalCalls ? top10 / totalCalls : null,
    },
    bands,
    networks: Object.entries(networks).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.endpoints - a.endpoints),
    categories: Object.entries(cats).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.calls - a.calls),
    sellers: sellerRows.slice(0, 100),
    topEndpoints: eps.filter((r) => calls(r) > 0).sort((a, b) => calls(b) - calls(a)).slice(0, 50)
      .map(({ resource, method, name, host, usd, calls, payers, lastCalledAt, cat }) => ({ resource, method, name, host, usd, calls, payers, lastCalledAt, cat })),
    history,
  }
}

/** One row per UTC day, latest run wins, 365 days kept. */
export function appendHistory(prev, doc) {
  const t = doc.totals
  const row = { date: doc.generatedAt.slice(0, 10), endpoints: t.endpoints, sellers: t.sellers, calls30d: t.calls30d, withCalls: t.withCalls }
  const byDate = new Map((Array.isArray(prev) ? prev : []).map((r) => [r.date, r]))
  byDate.set(row.date, row)
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-365)
}
