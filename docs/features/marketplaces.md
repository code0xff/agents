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

## Implementation (2026-09-05)
- `src/features/marketplaces/MarketplacesPanel.tsx`: static cards + top aggregates (agenteconomy, OCAI)
  + snapshot cards (resource count, 24h additions, three most recent additions) + sparklines.
- Hooks: `useAggregates.ts` (`useAgentEconomy`, `useOcaiStats`, `useSnapshot`).
- Card copy comes from i18n keys `mp.card.<id>.*`.
