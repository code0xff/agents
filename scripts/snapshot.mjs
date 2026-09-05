// CI에서 실행: CORS로 브라우저에서 직접 못 읽는 소스를 정적 JSON으로 저장한다 (docs/research/marketplaces.md).
// 사용: node scripts/snapshot.mjs  → public/snapshots/*.json
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = 'public/snapshots'
const STATE = 'data/snapshot-state' // diff용 전체 키 목록 (배포 안 됨, 커밋됨)
const DAY = 86_400_000
await fs.mkdir(OUT, { recursive: true }); await fs.mkdir(STATE, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getJson(url, tries = 5) {
  let backoff = 1000
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } })
    if (r.status === 429) { await sleep(backoff); backoff = Math.min(backoff * 2, 32_000); continue }
    if (!r.ok) throw new Error(`${r.status} ${url}`)
    return r.json()
  }
  throw new Error(`rate limited ${url}`)
}
async function prev(name) { try { return JSON.parse(await fs.readFile(path.join(STATE, `${name}.json`), 'utf8')) } catch { return null } }
async function write(name, items, extra = {}) {
  const old = await prev(name)
  const oldKeys = new Map((old?.items ?? []).map((i) => [i.key, i.addedAt]))
  const now = new Date().toISOString()
  for (const it of items) it.addedAt = oldKeys.get(it.key) ?? (old ? now : it.updated ?? now)
  items.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
  const added24h = items.filter((i) => Date.now() - new Date(i.addedAt).getTime() < DAY).length
  // 브라우저가 읽을 파일은 작게: 최근 300건만. 전체 키/추가시각은 .full.json에 보관해 다음 diff에 사용.
  await fs.writeFile(path.join(STATE, `${name}.json`), JSON.stringify({ items: items.map((i) => ({ key: i.key, addedAt: i.addedAt })) }))
  const doc = { generatedAt: now, total: items.length, added24h, ...extra, items: items.slice(0, 300) }
  await fs.writeFile(path.join(OUT, `${name}.json`), JSON.stringify(doc))
  console.log(name, items.length, 'items,', added24h, 'new in 24h')
}

// 1) Bazaar 계열 (x402 discovery/resources, 페이지네이션 100)
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

// 2) agentscan 신규 에이전트
async function agentscan() {
  const j = await getJson('https://agentscan.info/api/agents?page=1&page_size=100')
  const stats = await getJson('https://agentscan.info/api/stats').catch(() => null)
  const items = (j.items ?? []).map((a) => ({ key: `${a.network_id}:${a.token_id}`, name: a.name || `#${a.token_id}`, network: a.network_name, address: a.address, description: (a.description ?? '').slice(0, 160), updated: a.created_at }))
  await write('agentscan', items, { stats: stats && { total: stats.total_agents, active: stats.active_agents, networks: stats.total_networks } })
}

const jobs = [
  ['bazaar-cdp', () => bazaar('bazaar-cdp', 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources')],
  ['bazaar-payai', () => bazaar('bazaar-payai', 'https://facilitator.payai.network/discovery/resources')],
  ['agentscan', agentscan],
]
let failed = 0
for (const [n, fn] of jobs) { try { await fn() } catch (e) { failed++; console.error('FAIL', n, e.message) } }
process.exit(failed === jobs.length ? 1 : 0)
