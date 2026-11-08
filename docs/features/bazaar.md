# Feature: Bazaar market (`#/bazaar`)

Research: `docs/research/bazaar.md`.

## Data
`scripts/snapshot.mjs` pages the CDP Bazaar catalog once (1,000 per page) for the `bazaar-cdp`
marketplace snapshot and, from the same pass, `scripts/bazaar-market.mjs` builds
`public/snapshots/bazaar-market.json` (~30 KB): totals, price bands (endpoints and calls),
networks, keyword category estimate, top 100 sellers by host, top 50 endpoints by 30-day calls,
and a daily history. History is also kept in `data/bazaar-history.json` (committed, 365 days).

The market file is not written when the read falls more than 2% short of `pagination.total`.

## UI (`src/features/bazaar/`)
- `useMarket.ts`: fetch + shape normalisation.
- `BazaarPanel.tsx`: headline stats and top-10 concentration; price × demand (endpoint share
  against call share per band); networks; categories (labelled as an estimate); sellers table and
  top endpoints, both paginated; daily trend; reading notes.

## Not included
No endpoint explorer: the catalog is tens of MB and would not suit mobile.

## Implementation
Done: collector, route, four locales. Next: link the Bazaar card on Marketplaces to this route.
