# ERC-8004 registry research

Date: 2026-09-05

## Goal
Read recent agent registrations from the Identity Registry on major chains directly in the browser and
show them as a live log.

## Established facts

### Contracts (verified: erc-8004-contracts repo, agentscan.info `/api/networks`, on-chain `eth_getCode`)
| Registry | Address (same singleton on every mainnet) |
|---|---|
| IdentityRegistry (ERC-721) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

- `0x8004A818BFB912233c491871b3d84c89A494BD9e` / `0x8004B663…` are **Sepolia testnet** addresses. Some
  blog posts mislabel them as mainnet. Do not use.
- Mainnet deployments (30+): Ethereum, Base, BNB, Arbitrum, Optimism, Polygon, Avalanche, Linea, Scroll,
  Celo, Gnosis, Mantle, Monad, Abstract, and more.
- Registration counts (agenteconomy, 2026-09-04): 554k total, BNB 328k, Base 86k, Ethereum 68k.

### Events (from the EIP text; keccak computed locally)
| Event | Signature | topic0 |
|---|---|---|
| Registered | `Registered(uint256 indexed agentId, string agentURI, address indexed owner)` | `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a` |
| URIUpdated | `URIUpdated(uint256 indexed agentId, string newURI, address indexed updater)` | `0x3a2c7fffc2cba7582c690e3b82c453ea02a308326a98a3ad7576c606336409fb` |
| MetadataSet | `MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)` | `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b` |
| NewFeedback (Reputation) | `NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` | `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` |

Read functions: `tokenURI(uint256)` (= agentURI), `getAgentWallet(uint256)`, `getMetadata(uint256,string)`.

### Public RPC measurements (`eth_getLogs` with the Registered filter; CORS checked with an Origin header)
| Chain | RPC | getLogs range | CORS | Notes |
|---|---|---|---|---|
| Base | `https://mainnet.base.org` | 10,000 blocks OK (78 logs, 350ms) | `*` | **Primary.** publicnode/1rpc reject getLogs |
| Ethereum | `https://gateway.tenderly.co/public/mainnet`, `https://rpc.mevblocker.io` | 10,000 OK (tenderly 50k OK, mevblocker capped at 10k) | `*` | drpc dropped after intermittent "Can't route" failures. Rejected: publicnode (archive token), ankr (auth), 1rpc (50-block cap), blastapi, zan, blockrazor |
| BNB | `https://bsc-rpc.publicnode.com` | 5,000 OK (27 logs) | `*` (verified in-app) | binance dataseed rejects the range; drpc returns 429 |
| Polygon | `https://polygon-bor-rpc.publicnode.com` | 1,000 OK | not checked | polygon-rpc.com returns 401 |
| Arbitrum | `https://arb1.arbitrum.io/rpc` | 5,000 OK | not checked | little activity |
| Optimism | `https://mainnet.optimism.io` | 5,000 OK | not checked | little activity |

→ First implementation covers **Base + Ethereum + BNB**, each with the RPC above plus a fallback.

### agentURI measurements (Base, latest 10k blocks, 78 events)
- Empty URI 27 (registered without `setAgentURI`), `data:` URI 45 (inline JSON, parse immediately),
  https 5, ipfs 1.
- https metadata hosts (flextrust.io, S3, ...) send **no CORS headers** → browser fetch fails. ipfs.io
  returns `ACAO: *` in curl but fetch failed in the browser (gateway latency/404 suspected; re-verify
  during implementation).
- Conclusion: decode `data:` URIs for name/description, try a gateway for `ipfs://` and drop on failure,
  **do not fetch** https URIs — show a link only.

### Registration file JSON fields
`type`, `name`, `description`, `image`, `services[]{name,endpoint}`, `active`,
`registrations[]{agentId,agentRegistry}`, `supportedTrust[]`, `x402Support`.

## Secondary sources (browser CORS)
| Source | Direct from browser | Contents |
|---|---|---|
| `https://dashboard.agenteconomy.to/data.json` | **OK** (`ACAO: *`) | per-chain totals, 90-day daily registrations, x402/Olas/ACP aggregates; refreshed 1–2×/day |
| `https://api.onchainagentintel.io/v1/public/{stats,leaderboards}` | **OK** | Base/Ethereum index stats, most-recent leaderboard |
| `https://agentscan.info/api/{agents,stats,activities,networks}` | **blocked** | 22 networks, 541k agents, newest-first, activity feed — CI snapshot candidate |
| `https://rnwy.com/api/agents` | **blocked** | 12-chain trust scores — CI snapshot candidate |

## Conclusion / adopted
1. Live log: viem `getLogs` over Base (10k), Ethereum (10k), BNB (5k) on load, then poll blocks after
   `head` every 15s.
2. Metadata: decode `data:` immediately, try a gateway for `ipfs://`, link-only for https.
3. Totals/trends: agenteconomy `data.json`.
4. Per-chain new-agent details (names/skills) from the agentscan snapshot (CI; see
   `docs/research/marketplaces.md`).

## Open questions
- Polygon not implemented.
- A `Registered` event with an empty URI can be filled later by `URIUpdated` → subscribe to both and merge.
