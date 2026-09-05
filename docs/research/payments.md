# x402 payments / facilitator research

Date: 2026-09-05

## Goal
Observe real agent payments (payer → facilitator → receiving service) directly in the browser, centered
on major facilitators, and render them as a graph.

## Payment mechanism (on-chain identification)
- The x402 `exact` scheme settles via EIP-3009 `transferWithAuthorization` / `receiveWithAuthorization`,
  **called on the USDC contract by the facilitator EOA**.
- So one payment = a transaction with `tx.to == USDC` and selector ∈ {transferWithAuthorization,
  receiveWithAuthorization}. `tx.from` = facilitator; calldata `(from, to, value)` = payer, receiving
  service, amount.
- USDC (Base): `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. Transfer topic0 `0xddf252ad…`.
- Logs alone (`getLogs`) do not reveal the tx sender, so **blocks must be fetched with full transactions**
  and filtered.

### Measurements (Base, `mainnet.base.org`, 61 blocks ≈ 2 minutes)
| Item | Value |
|---|---|
| Fetch time per block | ~350ms (31 blocks in 10.7s) |
| EIP-3009 USDC calls in 61 blocks | 38 (≈ 0.3/s) |
| Top senders | `0x97acce27…` (3.16M txs total, no label), `0x13600897…`, `0xa32ccda9…` |
| Matches against known facilitator lists | **0** |

→ The addresses producing volume today are **absent** from public lists (x402.watch,
@swader/x402facilitators, BaseScan labels). Coinbase and others may rotate addresses, or these are new
facilitators. Both "labeled" and "unlabeled high-frequency senders" must be treated as nodes to show
the real flow.

## Facilitator directories
| Source | Form | Direct from browser | Contents |
|---|---|---|---|
| `https://facilitators.x402.watch/` | static HTML on GitHub Pages | OK (`ACAO: *`) | 19 facilitators, URL/networks/on-chain addresses (57 Base addresses) |
| `@swader/x402facilitators` (npm 0.0.14, 2025-11) | TS package | bundleable (jsDelivr OK) | Typed source of the same data. Heavy deps (`x402`, `@coinbase/x402`) → addresses copied into `src/data/facilitators.json` |
| BaseScan label `x402` | HTML | not scrapeable | 19 addresses (Coinbase 1–10, Daydreams, X402rs 2·4, Canza) — added manually |
| agenteconomy `data.json` `x402.*` | JSON | **OK** | 183M cumulative txs, $41.6M volume, 18 facilitators tracked, monthly/daily (60d)/per-chain/protocol share (PayAI 26%, Coinbase, Daydreams, ...) |

### Major facilitators (Base; full addresses in `src/data/facilitators.json`)
Coinbase (10), Daydreams (1, `0x279e08f7…`), X402rs (6), PayAI (5), Questflow (10), Heurist (9),
CodeNut (4), AurraCloud (3), OpenX402 (2), Thirdweb (1), Virtuals ACP (1), KAMIYO (1),
Ultravioleta (1), Mogami, 402104, xEcho. Polygon Facilitator has 24 (Polygon).
web3trackers totals: Daydreams 8.1M, Coinbase 7.6M, X402rs 411k txs.

## Resource / service discovery (Bazaar)
| Endpoint | curl | Browser | Contents |
|---|---|---|---|
| `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=100&offset=N` | 200, no auth | **CORS blocked** | 16,161 resources. `accepts[]{network,payTo,amount,asset}`, `resource`, `type`, `lastUpdated`. Mostly Base; also Solana, Arbitrum, Polygon, Monad |
| `https://facilitator.payai.network/discovery/resources` | 200 | blocked | PayAI-registered resources |
| `https://facilitator.daydreams.systems/supported` | 200 | blocked | supported networks (eip155:1/8453, solana), `upto` scheme |

→ Bazaar is collected as a **CI snapshot** (a payTo → service URL map lets the payment graph name
receiving nodes).

## Conclusion / adopted
1. **Live payment stream**: every 10s fetch the latest Base blocks (≈5) with full transactions from
   `mainnet.base.org` and extract USDC EIP-3009 calls. Recover payer/payTo/amount with viem
   `decodeFunctionData`.
2. **Facilitator identification**: match `src/data/facilitators.json` (x402.watch + BaseScan labels) →
   name. Unmatched senders with 3+ payments in the session become "Unlabeled facilitator" nodes.
3. **Receiving service names**: enrich with the CI-collected Bazaar `payTo → resource` map.
4. **Aggregate cards**: agenteconomy `data.json` x402 totals, daily, share.
5. Graph: D3 force. Facilitator nodes in the center; particles along payer→facilitator→payTo per payment.

## Open questions
- Full-block fetch load: 5 blocks/10s ≈ 2.5MB/10s. Consider a polling-interval option for mobile.
- Solana payments (~26% of the total) are out of scope (EVM only).
- Verify whether the `upto` scheme (Daydreams) uses a different contract path.
