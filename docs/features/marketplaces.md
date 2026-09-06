# Feature 1: Agent marketplace directory

## Goal
Show the existing agent marketplaces at a glance with their URL and **current activity data**.

## Minimum scope
Name, description, URL, chain/protocol (x402, ERC-8004, MCP, ...), status (live/beta)

## Extended scope (verified in research — ground rule 3)
- Feed of newly added agents/resources
- Registered agent counts, transaction/call counts
- Category distribution
- Live when on-chain events are available, otherwise a static snapshot

## Data
`src/data/marketplaces.json` static base + per-marketplace aggregates/snapshots

## UI / motion
Card grid, staggered entry, luminance lift on hover. Activity metrics count up.

## Research
`docs/research/marketplaces.md`

## Period of the headline figures
Both x402 totals cover the same span: twelve months from October 2025. Verified by summing the
monthly series, which matches `totalTxs` and `totalVolume` exactly.

The volume figure needs its shape shown, not just its total. About 72% of the $41.7M fell in
November and December 2025; recent months run two orders of magnitude lower while transaction counts
have risen, so the average payment has gone from about $0.39 to about $0.02. The tile therefore
carries a sparkline and a month-over-month trend.

Volume exists only in the monthly series, so it cannot use the 7-day comparison the count tiles use.
`periodTrend` compares the last two complete months and skips the month in progress, which would
otherwise put a few days against a full month and read as a collapse.

## Implementation (2026-09-05)
- `src/features/marketplaces/MarketplacesPanel.tsx`: static cards + top aggregates (agenteconomy, OCAI)
  + snapshot cards (resource count, 24h additions, three most recent additions) + sparklines.
- Hooks: `useAggregates.ts` (`useAgentEconomy`, `useOcaiStats`, `useSnapshot`).
- Card copy comes from i18n keys `mp.card.<id>.*`.
