# Development process

Every feature follows these steps. Never skip research and go straight to implementation.

## 1. Research (`docs/research/<feature>.md`)

- Where the data lives: on-chain (contracts/events), public API, static page, RSS
- Whether the browser can reach it directly: CORS, auth, rate limits
- Capture real response samples (curl / browser console) and paste them into the doc
- For marketplaces, additionally verify:
  - Can new agent registrations/additions be obtained?
  - Are there activity metrics (transactions, payments, call counts)?
  - Are categories, reputation, owner, or pricing available?
  - If on-chain, which contract and chain?
- When direct access is impossible, record the alternative (a CORS-open public mirror, a static
  snapshot committed to the repo, periodic refresh via CI)

## 2. Design

- Record the data model, component structure, and animation plan in `docs/features/<feature>.md`
- Add new sources to `docs/data-sources.md`

## 3. Implement

- Isolate under `src/features/<feature>/`
- Fetch logic in `api.ts`/hooks, types in `types.ts`, UI in components
- Empty and error states are mandatory (public RPCs fail often)
- All UI strings go through `src/i18n` (see `docs/i18n.md`)

## 4. Verify

- `npm run build` passes
- Build with `VITE_BASE` and check sub-path behavior with `npm run preview`
- Check both light and dark themes and at least two locales

## Research doc template

```
# <feature> research
Date:
## Goal
## Candidate sources
| Source | Type | Direct from browser | Auth | Data provided | Notes |
## Response samples
## Conclusion / adopted sources
## Open questions
```
