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
- `usePayments.ts`: backfill the latest 150 Base blocks, then poll every 10s.
  The scan reads `AuthorizationUsed` logs from USDC, which that token emits only from a successful
  EIP-3009 call, so the log set is exactly the settlements: reverted authorisations never appear and
  nothing else does. Only the transactions those logs name are then fetched, to read the submitting
  facilitator and decode the amount and recipient. Timestamps are derived from block distance at 2s
  per block rather than fetched.

  The previous scan pulled every block in full to find them. Measured on Base: about 250 KB per block,
  roughly 443 MB per hour of open tab, to keep a handful of transactions. The log-first scan measured
  0.8 KB/s over a minute, and about 6 MB per hour for the whole dashboard including the registry. Facilitator labels from `facilitators.json`; unlabeled senders with
  3+ payments become `Unlabeled xxxx` nodes.
- `PaymentGraph.tsx`: D3 force on a canvas 1.9x the panel, viewed through a camera. Nodes are bounded
  to an ellipse rather than the canvas rectangle, and the forces are tuned so the cluster settles well
  inside that bound (max normalised radius around 0.8, nothing resting on it). A bound only shapes the
  layout when the layout is pressed against it, which is what made the graph look like a box, and the SVG carries an edge mask (`.map-fade`) so the view dissolves at the panel
  boundary instead of being cut by a straight line. The layout is
  allowed to spread instead of being packed into the visible rectangle; the camera eases toward the
  centroid of the newest settlements and yields to the reader for 9s after any pan, zoom or drag.
  Zoom and pan controls sit in the corner of the canvas; the wheel zooms and dragging pans. Reset
  recentres and hands the camera back to the follower.

  Touch is claimed explicitly through a hand button shown only on small screens. Until it is pressed
  the map ignores touch entirely and the page scrolls as usual; once pressed the SVG switches to
  `touch-action: none` and one finger pans while a pinch zooms. Filtering to two fingers instead does
  not work: d3-zoom never registers the first touch, so no pinch can form, and `touch-action: pan-y`
  lets the browser steal the gesture the moment it moves vertically. `touchable` is forced on, because
  d3 otherwise decides whether to bind touch handlers from a capability sniff at call time.
  Particle plus ring pulse per payment, draggable nodes.
  The simulation is reheated only when the set of nodes actually changes. Reheating on every poll
  rearranged the graph under the reader, including immediately after they panned.
- Retention is bounded: 300 payments, 200 registry events, 120 nodes in the graph window. Blocks and
  logs are scanned and discarded, never accumulated. Measured over 6.8 minutes the payment list held
  at exactly 300 and the JS heap stayed flat around 16 MB.
- `PaymentsPanel.tsx`: window stats, top senders, recent list. Every recent row is a real settlement,
  so it links to its transaction on BaseScan.
- Not yet applied: Bazaar payTo map (`public/snapshots/bazaar-cdp.payto.json`) to name payTo nodes.
  Measured 2026-09-05: it resolves about 30% of live settlements to a service host, which would
  replace hex with names such as `agents.chain.link` on the receiving side.

## Facilitator labelling
Detection is exact: the facilitator is `tx.from` on the USDC call. Naming is the gap. Measured over
151 Base blocks on 2026-09-05, 209 settlements came from 28 distinct senders and **none** matched the
58 Base addresses in `facilitators.json`. The public directory (facilitators.x402.watch) does not list
them either, and BaseScan has no name tag for the busiest of them. Operators appear to rotate relayer
addresses, and the public lists still carry addresses first seen in late 2025. Unknown senders are shown as their address, with no filler word. Labelling each one "Unnamed"
repeated a word on every row and added nothing, and the earlier Korean rendering, "미확인", read as
"unverified" and wrongly suggested the payment itself was in doubt. A name appears only when a
directory supplies one; hovering an address explains that none does.
