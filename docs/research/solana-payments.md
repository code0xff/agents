# Solana x402 payments research

Date: 2026-09-05

## Goal
Decide whether x402 settlements on Solana can be read from the browser with no backend, on the same
terms as Base and Polygon, and at what cost.

## Why it was considered
Solana carries 29.3% of counted x402 payments (48.2M of 183M), second only to Base. It is the largest
part of the ecosystem the dashboard does not observe.

## Mechanism (differs entirely from EVM)
There is no EIP-3009 on Solana, so `AuthorizationUsed` has no equivalent. The `exact` scheme instead
uses a partially signed SPL transfer:

- The payer signs an SPL `TransferChecked` as the transfer **authority**.
- The facilitator signs as **fee payer** and submits. The payer never holds SOL for gas.
- The instruction layout is fixed: ComputeBudget, then `TransferChecked`, and in practice a Memo.

Confirmed against a live transaction: fee payer is the facilitator, `authority` is the payer, `mint`
is USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, and `meta.postTokenBalances` carries the
`owner` of each token account, so the paying and receiving wallets resolve with no extra call. The
`destination` in the instruction is an associated token account, not a wallet, so that field alone
would be misleading.

## Detection strategy
The EVM approach does not transfer: there is no log to filter on. The workable equivalent is to walk
each known facilitator's own history.

1. `getSignaturesForAddress(facilitator, { limit })` — the facilitator is the fee payer, so every
   settlement it submits appears in its signature list.
2. `getTransaction(signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 })` —
   returns the decoded `TransferChecked` and the token-account owners.

This needs no indexer and, importantly, **no new dependency**: `jsonParsed` returns decoded
instructions, so plain `fetch` against JSON-RPC is enough. `@solana/web3.js` would add roughly
100 KB gzipped for nothing we need.

## Public RPC
| Endpoint | Result |
|---|---|
| `https://solana-rpc.publicnode.com` | **Works.** `getSlot`, `getSignaturesForAddress`, `getTransaction` all served, `access-control-allow-origin: *` |
| `https://api.mainnet-beta.solana.com` | 403 Access forbidden |
| `https://solana.drpc.org` | 400, chain not on the free plan |

Only one usable endpoint was found, so there is no fallback. That is a real single point of failure.

## Measured cost
| Call | Size |
|---|---|
| `getSignaturesForAddress`, limit 60 | 15.2 KB |
| `getTransaction`, one settlement | 4.4 KB |

PayAI alone submits about 300 settlements per minute. Fetching every one would cost roughly 79 MB per
hour, more than three times the current two-chain total. Solana therefore cannot be read exhaustively;
it has to be sampled, with a per-poll cap well below the settlement rate, and the panel has to say
that its Solana figures are a sample rather than a count.

## Facilitator coverage
Of the ten Solana addresses in `src/data/facilitators.json`, only two have any signatures at all:

| Facilitator | Recent activity |
|---|---|
| PayAI | ~300/min |
| OpenX402 | one signature, 15 minutes old |
| Coinbase, Daydreams, Corbits, Dexter, CodeNut, AurraCloud, KAMIYO, Ultravioleta | none |

So Solana x402 today is effectively one operator. The other listed addresses are stale, or are not the
fee payer for their settlements. Reading only the addresses we know would therefore both miss activity
from unlisted facilitators and present a one-operator view as if it were the whole chain. On EVM this
is not a problem, because the scan starts from the token's own logs and finds every facilitator
whether or not it is listed.

## Conclusion
Technically feasible, with no new dependency, and the reconstruction is complete. Two things make it a
worse deal than it looks:

1. **It cannot be complete.** There is no chain-wide filter for x402 the way `AuthorizationUsed` is on
   EVM, so coverage is limited to facilitators we already know, and the rate forces sampling on top of
   that. Every other panel in this dashboard reports what it actually observed; a Solana panel would
   report a sample of a subset.
2. **One RPC, no fallback.**

## Built, then removed (2026-09-06)
Built as described below, then taken out the same day. On the page it read as four look-alike cells
holding a live sample, two aggregates and a snapshot count, and it never said what question it
answered. Exposing a chain that cannot be read properly turned out to cost more attention than it
returned. What survives is the chain split on the overview, where Solana appears as one row among the
chains the headline total is made of, which is the honest place for it.

## What was built (superseded)
The conclusion above was reached against the wrong bar: it asked whether Solana could be read the way
Base and Polygon are. Exposed as its own thing, with its limits stated, it is worth having, and three
pieces were already within reach:

- **Observed rate**, from `getSignaturesForAddress` only. Block times are all a rate needs, so the
  transactions are never fetched: 6.6 KB a poll, about 0.8 MB an hour at 30s, against the 79 MB an
  hour a full read would cost. Addresses that answer nothing on the first pass are dropped from the
  rotation, so the eight inactive ones cost one request in total.
- **Share and cumulative count**, from the agenteconomy aggregate already fetched for the overview.
- **Services accepting Solana**, counted from the Bazaar snapshots already collected: 4,566 of them.

It lives in its own block under the payments panel, never in the chain selector, the flow graph or the
recent list, and it says on the face of it that it is a sample rather than a count. The flow graph is
still not attempted, for the reasons below.

Original recommendation, kept for the record: not now. Revisit if a chain-wide filter appears (a shared program or a memo convention
that can be queried), or if a second CORS-open RPC shows up. If it is built anyway, it should be a
separate panel labelled as a sample, not merged into the Base and Polygon flow.

## Open questions
- Is there a memo convention on the x402 Solana transactions that could be used as a chain-wide
  filter? The sampled transaction did include a Memo instruction; its contents were not examined.
- Do the inactive facilitator addresses settle under different fee-payer keys, and is there a public
  source for the current ones?
