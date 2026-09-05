# Agent marketplace research

Date: 2026-09-05

## Goal
Go beyond a list of marketplaces + URLs: verify for each platform **whether new agents/services and
activity metrics can be pulled**.

## Candidates and available data
| Marketplace | URL | Type | Direct from browser | What can be pulled | Verdict |
|---|---|---|---|---|---|
| x402 Bazaar (Coinbase CDP) | `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` | x402 service discovery | CORS blocked | 16,161 paid API/MCP resources, new items via `lastUpdated`, price/network/payTo | **CI snapshot** (core) |
| PayAI Bazaar | `https://facilitator.payai.network/discovery/resources` | same | blocked | PayAI-registered resources (Avalanche etc.) | CI snapshot |
| ERC-8004 Identity Registry | on-chain (Base/Eth/BNB) | agent registry | **OK** (RPC) | live new registrations | live (`registry.md`) |
| agentscan.info | `https://agentscan.info/api/agents?page_size=N`, `/api/activities`, `/api/stats` | 8004 explorer | blocked | 22 networks, 541k agents, newest-first, name/skills/reputation, activity feed | CI snapshot |
| RNWY | `https://rnwy.com/api/agents` | 8004 trust index | blocked | 12-chain new registrations, scores, MCP/A2A endpoints | CI snapshot (secondary) |
| On-Chain Agent Intel | `https://api.onchainagentintel.io/v1/public/*` | 8004 index (Base/Eth) | **OK** | stats, top MCP/OpenAPI/most-recent leaderboards, per-chain ready agents | live |
| agenteconomy.to | `https://dashboard.agenteconomy.to/data.json` | aggregate dashboard | **OK** | x402 · 8004 · Olas · Virtuals ACP · Tempo MPP totals/daily | live (aggregate) |
| Virtuals ACP | `https://app.virtuals.io`, `acpx.virtuals.io` (facilitator) | agent commerce | not checked | daily memo counts available in agenteconomy (12.3M cumulative) | link + aggregate |
| Olas Mech Marketplace | `https://olas.network/mech-marketplace` | agent-to-agent task market (Gnosis) | not checked | weekly txs available in agenteconomy (19.2M cumulative) | link + aggregate |
| 8004scan (AltLayer) | `https://8004scan.io` | explorer | no API (404) | — | link only |
| Quicknode ERC-8004 Explorer | `https://erc-8004.quicknode.com` | explorer | no API | — | link only |
| Agent Arena | `https://agentarena.site` | service catalog | no API | — | link only |
| 2s | `https://2s.io` | 570+ x402 endpoints | no API | — | link only |
| ClawHub | `https://clawhub.com` | OpenClaw skill registry (off-chain) | not checked | 3,000+ skills | link only (out of scope) |
| Moltbook | `https://moltbook.com` | agent social network (acquired by Meta) | not checked | — | link only (out of scope) |
| 8k4 Protocol | — | — | 410 Gone | service retired | excluded |

## Response samples (summary)
- CDP Bazaar: `{items:[{accepts:[{network:"eip155:8453",payTo,amount,asset}],resource,type:"http"|"mcp",lastUpdated,x402Version:2}],pagination:{limit,offset,total:16161}}`
- agentscan `/api/agents`: `{items:[{name,address,description,network_id,token_id,owner_address,reputation_score,skills[],created_at}],total,page,page_size}`
- onchainagentintel `/v1/public/stats`: `{agents_indexed:25708,mcp_agents,openapi_agents,chains_breakdown:{base,eth}}`

## Conclusion / adopted
1. Marketplace cards come from the static `src/data/marketplaces.json` (name, URL, type, chains,
   protocols, feed-type badge).
2. **CI snapshot pipeline**: a GitHub Actions schedule (6h) fetches the sources below →
   `public/snapshots/*.json` → commit → Pages redeploy. Works around CORS without a backend.
   - `bazaar-cdp.json`: full pagination (100 per page, 429 backoff) → resource, payTo, network, price, lastUpdated
   - `bazaar-payai.json`
   - `agentscan.json`: newest 100 + `/api/stats`
   - Diff against the previous snapshot to produce a "newly added" feed (`addedAt`)
3. Live in the browser: 8004 on-chain events, onchainagentintel, agenteconomy.
4. Card metrics: resource count, last-24h additions, chain distribution, cumulative txs where available.

## Open questions
- CDP Bazaar rate limit (429): 16k items / 100 = 162 requests; handled with backoff in CI.
- Whether Virtuals/Olas expose public APIs is a second-round research item.
