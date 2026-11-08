// Runs in CI: saves sources the browser cannot read directly (CORS) as static JSON (see docs/research/marketplaces.md).
// Usage: node scripts/snapshot.mjs  -> public/snapshots/*.json
import fs from 'node:fs/promises'
import path from 'node:path'
import { appendHistory, compact, market } from './bazaar-market.mjs'

const OUT = 'public/snapshots'
const STATE = 'data/snapshot-state' // full key list for diffing (committed, not deployed)
const DAY = 86_400_000
await fs.mkdir(OUT, { recursive: true }); await fs.mkdir(STATE, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TIMEOUT_MS = 30_000

// Retries rate limits, network errors and 5xx. A hung request must not eat the job's timeout.
async function getJson(url, tries = 5) {
  let backoff = 1000
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (r.status === 429 || r.status >= 500) {
        last = new Error(`${r.status} ${url}`)
        await sleep(backoff); backoff = Math.min(backoff * 2, 32_000); continue
      }
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      return await r.json()
    } catch (e) {
      if (e instanceof Error && /^\d{3} /.test(e.message)) throw e
      last = e
      await sleep(backoff); backoff = Math.min(backoff * 2, 32_000)
    }
  }
  throw last ?? new Error(`failed ${url}`)
}
async function prev(name) { try { return JSON.parse(await fs.readFile(path.join(STATE, `${name}.json`), 'utf8')) } catch { return null } }
async function write(name, items, extra = {}) {
  const old = await prev(name)
  const oldKeys = new Map((old?.items ?? []).map((i) => [i.key, i.addedAt]))
  const now = new Date().toISOString()
  for (const it of items) it.addedAt = oldKeys.get(it.key) ?? (old ? now : it.updated ?? now)
  items.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
  const added24h = items.filter((i) => Date.now() - new Date(i.addedAt).getTime() < DAY).length
  // Keep the browser-facing file small: latest 300 items only. Full keys/addedAt go to the state dir for the next diff.
  await fs.writeFile(path.join(STATE, `${name}.json`), JSON.stringify({ items: items.map((i) => ({ key: i.key, addedAt: i.addedAt })) }))
  // `total` is the size of this snapshot, not a claim about the source's global total.
  const doc = { generatedAt: now, total: items.length, added24h, ...extra, items: items.slice(0, 300) }
  await fs.writeFile(path.join(OUT, `${name}.json`), JSON.stringify(doc))
  console.log(name, items.length, 'items,', added24h, 'new in 24h')
}

// 1) Bazaar-style sources (x402 discovery/resources). `withMarket` also builds the #/bazaar
//    aggregates from the same pass, so the catalog is read once.
async function bazaar(name, base, { limit = 100, withMarket = false } = {}) {
  const items = [], rows = []; let offset = 0, total = Infinity, reported = null
  while (offset < total) {
    const j = await getJson(`${base}?limit=${limit}&offset=${offset}`)
    total = j.pagination?.total ?? (j.items?.length ?? 0)
    reported ??= total
    for (const it of j.items ?? []) {
      const a = it.accepts?.[0] ?? {}
      let host = it.resource; try { host = new URL(it.resource).host } catch {}
      items.push({ key: it.resource, name: host, url: it.resource, type: it.type, network: a.network, payTo: a.payTo?.toLowerCase(), price: a.amount ?? a.maxAmountRequired, asset: a.asset, updated: it.lastUpdated })
      if (withMarket) { const r = compact(it); if (r) rows.push(r) }
    }
    if (!j.items?.length) break
    offset += limit
  }
  const networks = {}; for (const i of items) networks[i.network] = (networks[i.network] ?? 0) + 1
  const payTo = {}; for (const i of items) if (i.payTo) payTo[i.payTo] = i.name
  await fs.writeFile(path.join(OUT, `${name}.payto.json`), JSON.stringify(payTo))
  await write(name, items, { networks })
  if (withMarket) await writeMarket(rows, items.length, reported)
}

// Fail closed: a read that came back well short of the reported total is not published as the
// market, since every share and ranking would be computed over an unknown subset. The catalog
// moves while it is paged, so a small drift is tolerated.
async function writeMarket(rows, read, reported) {
  if (!reported || read < reported * 0.98) throw new Error(`bazaar market: read ${read} of ${reported} reported entries`)
  const histFile = path.join('data', 'bazaar-history.json')
  let hist = []; try { hist = JSON.parse(await fs.readFile(histFile, 'utf8')) } catch {}
  const now = new Date().toISOString()
  const draft = market(rows, reported, now, [])
  const history = appendHistory(hist, draft)
  await fs.writeFile(histFile, JSON.stringify(history))
  await fs.writeFile(path.join(OUT, 'bazaar-market.json'), JSON.stringify({ ...draft, history }))
  console.log('bazaar-market', draft.totals.endpoints, 'endpoints,', draft.totals.sellers, 'sellers')
}

// 2) agentscan newest agents
async function agentscan() {
  const j = await getJson('https://agentscan.info/api/agents?page=1&page_size=100')
  const stats = await getJson('https://agentscan.info/api/stats').catch(() => null)
  const items = (j.items ?? []).map((a) => ({ key: `${a.network_id}:${a.token_id}`, name: a.name || `#${a.token_id}`, network: a.network_name, address: a.address, description: (a.description ?? '').slice(0, 160), updated: a.created_at }))
  // stats may be null; consumers must show "unavailable" rather than treat the page size as a total.
  await write('agentscan', items, { stats: stats ? { total: stats.total_agents, active: stats.active_agents, networks: stats.total_networks } : null })
}

const jobs = [
  ['bazaar-cdp', () => bazaar('bazaar-cdp', 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources', { limit: 1000, withMarket: true })],
  ['bazaar-payai', () => bazaar('bazaar-payai', 'https://facilitator.payai.network/discovery/resources')],
  ['agentscan', agentscan],
]
// Any failed source is a failure: a green run with one stale snapshot hides the problem.
// Sources that did succeed keep their freshly written files, and the workflow commits them
// before failing the run (.github/workflows/snapshot.yml).
// Optional names on the command line run only those sources: node scripts/snapshot.mjs bazaar-cdp
const only = process.argv.slice(2)
const run = only.length ? jobs.filter(([n]) => only.includes(n)) : jobs
let failed = 0
for (const [n, fn] of run) { try { await fn() } catch (e) { failed++; console.error('FAIL', n, e?.message ?? e) } }
if (failed) { console.error(`${failed} of ${run.length} sources failed`); process.exit(1) }
