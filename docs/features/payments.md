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
- `PaymentGraph.tsx`: D3 force on a canvas 1.9x the panel, viewed through a camera. The layout is
  allowed to spread instead of being packed into the visible rectangle; the camera eases toward the
  centroid of the newest settlements and yields to the reader for 9s after any pan, zoom or drag.
  Touch gestures are left to the page on mobile so the graph does not trap scrolling.
  Particle plus ring pulse per payment, draggable nodes.
- `PaymentsPanel.tsx`: window stats, top senders, recent list.
- Not yet applied: Bazaar payTo map (`public/snapshots/bazaar-cdp.payto.json`) to name payTo nodes.
  Measured 2026-09-05: it resolves about 30% of live settlements to a service host, which would
  replace hex with names such as `agents.chain.link` on the receiving side.

## Facilitator labelling
Detection is exact: the facilitator is `tx.from` on the USDC call. Naming is the gap. Measured over
151 Base blocks on 2026-09-05, 209 settlements came from 28 distinct senders and **none** matched the
58 Base addresses in `facilitators.json`. The public directory (facilitators.x402.watch) does not list
them either, and BaseScan has no name tag for the busiest of them. Operators appear to rotate relayer
addresses, and the public lists still carry addresses first seen in late 2025. `Unlabeled xxxx` is
therefore an accurate statement about public knowledge, not a defect in the pipeline.
