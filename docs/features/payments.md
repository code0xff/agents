# Feature 3: Facilitator-centric x402 payment flow graph

## Goal
Visualize real agent payments as a node-edge graph centered on major facilitators.

## Data
- Facilitator address list (research)
- USDC EIP-3009 calls sent by facilitators (block scan on Base)
- Reconstruct payer → facilitator → resource server flows

## UI / motion
D3 force graph. Facilitators as central nodes; on each payment a particle travels along the edges and
the target node pulses. A recent-payments list sits beside the graph.

## Research
`docs/research/payments.md` — facilitator list/addresses, on-chain detection, public API availability

## Implementation (2026-09-05)
- `usePayments.ts`: backfill the latest 40 Base blocks, then poll every 10s; decode USDC EIP-3009 calls
  from full-transaction blocks. Facilitator labels from `facilitators.json`; unlabeled senders with
  3+ payments become `Unlabeled xxxx` nodes.
- `PaymentGraph.tsx`: D3 force, keeps the latest 120 payments, particle + ring pulse per payment,
  draggable nodes.
- `PaymentsPanel.tsx`: window stats, top senders, recent list.
- Not yet applied: Bazaar payTo map (`public/snapshots/bazaar-cdp.payto.json`) to name payTo nodes.
