// Runs in CI: saves sources the browser cannot read directly (CORS) as static JSON (see docs/research/marketplaces.md).
// Usage: node scripts/snapshot.mjs  -> public/snapshots/*.json
import fs from 'node:fs/promises'
import path from 'node:path'

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

// 1) Bazaar-style sources (x402 discovery/resources, paginated by 100)
async function bazaar(name, base) {
  const items = []; let offset = 0, total = Infinity
  while (offset < total) {
    const j = await getJson(`${base}?limit=100&offset=${offset}`)
    total = j.pagination?.total ?? (j.items?.length ?? 0)
    for (const it of j.items ?? []) {
      const a = it.accepts?.[0] ?? {}
      let host = it.resource; try { host = new URL(it.resource).host } catch {}
      items.push({ key: it.resource, name: host, url: it.resource, type: it.type, network: a.network, payTo: a.payTo?.toLowerCase(), price: a.amount ?? a.maxAmountRequired, asset: a.asset, updated: it.lastUpdated })
    }
    if (!j.items?.length) break
    offset += 100
  }
  const networks = {}; for (const i of items) networks[i.network] = (networks[i.network] ?? 0) + 1
  const payTo = {}; for (const i of items) if (i.payTo) payTo[i.payTo] = i.name
  await fs.writeFile(path.join(OUT, `${name}.payto.json`), JSON.stringify(payTo))
  await write(name, items, { networks })
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
  ['bazaar-cdp', () => bazaar('bazaar-cdp', 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources')],
  ['bazaar-payai', () => bazaar('bazaar-payai', 'https://facilitator.payai.network/discovery/resources')],
  ['agentscan', agentscan],
]
// Any failed source is a failure: a green run with one stale snapshot hides the problem.
// Sources that did succeed keep their freshly written files.
let failed = 0
for (const [n, fn] of jobs) { try { await fn() } catch (e) { failed++; console.error('FAIL', n, e?.message ?? e) } }
if (failed) { console.error(`${failed} of ${jobs.length} sources failed`); process.exit(1) }
