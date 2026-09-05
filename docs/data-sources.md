# Data source catalog

Verified 2026-09-05. Evidence in `docs/research/`.

## On-chain (browser → public RPC, CORS verified)
| Chain | RPC | getLogs range | Use |
|---|---|---|---|
| Base (8453) | `https://mainnet.base.org` | 10k | ERC-8004 registration logs, x402 payment block scan (primary) |
| BNB (56) | `https://bsc-rpc.publicnode.com` | 5k | ERC-8004 registration logs |
| Polygon (137) | `https://polygon-bor-rpc.publicnode.com` (fallback `https://polygon.drpc.org`) | 2k | x402 payment settlements |

### ERC-8004 (same address on every mainnet)
- IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Event topic0: Registered `0xca52e62c…`, URIUpdated `0x3a2c7fff…` (full list in `research/registry.md`)

### x402 payments (Base, Polygon)
- USDC on Base `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, on Polygon `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`.
  Polygon's bridged USDC.e carries no settlements (measured: 0 in 300 blocks).
- A payment = a facilitator EOA calling USDC `transferWithAuthorization` / `receiveWithAuthorization`.
  Found from the `AuthorizationUsed` log, which USDC emits only on a successful EIP-3009 call.
- Facilitator address list: `src/data/facilitators.json` (from facilitators.x402.watch and BaseScan labels)

## Public APIs — direct from the browser (CORS OK)
| Source | Contents |
|---|---|
| `https://dashboard.agenteconomy.to/data.json` | x402 / ERC-8004 / Olas / ACP aggregates, daily trends |
| `https://api.onchainagentintel.io/v1/public/{stats,leaderboards}` | Base/Ethereum agent index, most-recent |

## Public APIs — CORS blocked → CI snapshots (`public/snapshots/`, `scripts/snapshot.mjs`, every 6h)
| Source | Snapshot |
|---|---|
| `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` | `bazaar-cdp.json` |
| `https://facilitator.payai.network/discovery/resources` | `bazaar-payai.json` |
| `https://agentscan.info/api/{agents,stats}` | `agentscan.json` (page_size max 100) |

Snapshot files: `<name>.json` (latest 300 items + totals, for the browser), `<name>.payto.json`
(payTo → service host map), `data/snapshot-state/<name>.json` (full keys for diffing, not deployed).

## Static data (`src/data/`)
- `marketplaces.json` — marketplace cards (descriptions are i18n keys)
- `facilitators.json` — facilitator name/URL/networks/addresses
- `chains.ts` — chain metadata (name, RPC, explorer)

## Not read
- Ethereum: 68k agents cumulatively but one registration in six hours, and 522 x402 payments ever.
- Solana flow: no chain-wide filter and a single CORS-open RPC, so no payer-to-service graph.
  A sampled rate, the aggregate share and the Bazaar service count are shown instead, in their own
  block. See `research/solana-payments.md`.

## Solana (sampled)
| Source | Use |
|---|---|
| `https://solana-rpc.publicnode.com` `getSignaturesForAddress` | Observed settlement rate per known facilitator. Signatures only; transactions are never fetched |

## Constraints
- Public RPC range limits as in the table above. Chunking + 15s polling.
- Most https agent-metadata hosts lack CORS → parse `data:` URIs only, link the rest.
- Solana payments are out of scope.
