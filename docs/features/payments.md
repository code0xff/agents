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
- `PaymentsPanel.tsx`: window stats, top senders, recent list.
- Not yet applied: Bazaar payTo map (`public/snapshots/bazaar-cdp.payto.json`) to name payTo nodes.
  Measured 2026-09-05: it resolves about 30% of live settlements to a service host, which would
  replace hex with names such as `agents.chain.link` on the receiving side.

## Facilitator labelling
Detection is exact: the facilitator is `tx.from` on the USDC call. Naming is the gap. Measured over
151 Base blocks on 2026-09-05, 209 settlements came from 28 distinct senders and **none** matched the
58 Base addresses in `facilitators.json`. The public directory (facilitators.x402.watch) does not list
them either, and BaseScan has no name tag for the busiest of them. Operators appear to rotate relayer
addresses, and the public lists still carry addresses first seen in late 2025. The badge therefore states a fact about
public knowledge, not a defect in the pipeline, and it says so on hover. It reads "Unnamed" rather
than "Unverified": the address is certain, only its operator's name is missing. The Korean wording was
"미확인", which reads as "unverified" and wrongly suggested the payment itself was in doubt.
