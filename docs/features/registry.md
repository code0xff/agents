# Feature 2: ERC-8004 agent registration log

## Goal
Stream recently registered agents from the ERC-8004 Identity Registry on major chains as a live log.

## Data
- Per-chain registry contract → `getLogs` (Registered / URIUpdated)
- Agent metadata (agentURI / registration file): only `data:` URIs are parsed (CORS)
- Polling: 15s, block ranges chunked per chain limit

## UI / motion
Terminal-style log stream. New rows slide in at the top, chain badge, shortened mono address,
relative time.

## Research
`docs/research/registry.md` — contract addresses, ABI, event signatures, chains

## Implementation (2026-09-05)
- `useRegistry.ts`: initial range `getLogs` (Registered + URIUpdated) per chain, then 15s polling.
  Inline `data:` URI parsing.
- `RegistryLog.tsx`: chain toggles, slide-in + background flash for new rows, click to expand description.
- Ethereum registrations are infrequent; expect a handful per 10k blocks (~33h).
