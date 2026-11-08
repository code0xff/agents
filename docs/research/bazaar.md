# Bazaar market research
Date: 2026-11-08

## Goal
A dedicated route that reads the Coinbase CDP Bazaar catalog as a market: who sells, at what price,
on which networks, and where the reported demand sits. Prompted by a standalone prototype in
`~/workspace/bazaar` (Python collector + single-file dashboard); this records what carries over.

## Source
`GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=&offset=`

- No auth needed. A `CDP_BEARER_TOKEN` was never required in practice.
- No `access-control-allow-origin`, so the browser cannot call it: CI snapshot only (same as the
  existing `bazaar-cdp` marketplace snapshot in `scripts/snapshot.mjs`).
- `limit=1000` is accepted (the snapshot used 100). 34,118 entries on 2026-11-08 → 35 requests
  instead of 342. The total moves a lot between days (90,162 on 2026-11-02).
- About 3.5 KB per raw entry (input/output schemas included), so the full catalog is >100 MB raw and
  tens of MB even compacted. It must never ship to the browser; CI aggregates it.

Sample entry (trimmed):

```json
{"resource":"https://…/verdict","type":"http","x402Version":2,"lastUpdated":"…",
 "serviceName":"…","description":"Send a Base token contract address, get an AI-written verdict…",
 "tags":["…"],
 "accepts":[{"scheme":"exact","network":"eip155:8453","asset":"0x833589fC…02913","amount":"20000",
             "payTo":"0x7284…299C","maxTimeoutSeconds":300,"extra":{"name":"USD Coin","version":"2"}}],
 "extensions":{"bazaar":{"info":{"input":{"method":"POST","body":{…}},"output":{"example":{…}}}}},
 "quality":{"l30DaysTotalCalls":23687,"l30DaysUniquePayers":193,"lastCalledAt":"2026-10-21T09:39:38Z"}}
```

## Fields that matter
| Field | Coverage (first 1,000) | Use |
|---|---|---|
| `quality.l30DaysTotalCalls` | 100% | Demand. CDP-reported calls, not verified payments or revenue |
| `quality.l30DaysUniquePayers` | 100% | Per-endpoint only. Not summable across endpoints (same payer counted many times) |
| `accepts[].amount` + `asset` | 100% | Price. Only USDC (6 decimals) is converted to USD; asset addresses vary in case |
| `accepts[].network` | 100% | Mixed CAIP-2 and legacy names (`base`, `eip155:8453`); normalise |
| `accepts[]` length > 1 | 48% | Multi-network listings: count each network once per endpoint |
| `serviceName`, `tags` | ~70% | Category estimate input, with `description` and the URL |
| `extensions.bazaar.info.input.method` | 100% | GET 65% / POST 35%; dedupe key is URL + method |

## What carries over from the prototype
- Interpretation rules: listed ≠ working ≠ revenue; payers are never summed; USDC only for prices;
  sellers counted by host, not legal entity; no provider is pinned or boosted.
- Views: headline totals, price bands, price × demand, network split, seller ranking, daily trend.
- Fail-closed collection: a short read (fewer entries than `pagination.total`) does not publish.

## What does not
- Shipping the catalog to the browser and the endpoint explorer (decided against: size, mobile).
- The separate Python collector: `scripts/snapshot.mjs` already pages this API.
- The keyword category classifier as written: first-match regex ordering sends anything that says
  "price", "rate" or "market" to Finance. Kept as an estimate with tighter word-boundary rules and
  labelled as such.
- Hue accents and mixed-language strings (rules 4 and 8).

## Plan
`snapshot.mjs` writes `public/snapshots/bazaar-market.json` (aggregates only, target < 100 KB) and
appends one row per day to `data/bazaar-history.json` (committed, also copied to
`public/snapshots/`). New route `#/bazaar` renders it. Design in `docs/features/bazaar.md`.
