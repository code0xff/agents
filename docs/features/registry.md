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
- `RegistryLog.tsx`: chain toggles, slide-in + background flash for new rows. A row opens `AgentModal`.
- `AgentModal.tsx` + `meta.ts`: the registration file is parsed into a card rather than shown as raw
  JSON. `normalizeAgentMeta` accepts a field only when it has the right type, because these documents
  are written by anyone and an object where a string was expected would throw during render.
  Sources, measured 2026-09-05:
  - `data:` documents parse inline and never touch the network.
  - `ipfs://` is read through `gateway.pinata.cloud`, the one public gateway that sends CORS headers;
    ipfs.io, dweb.link and w3s.link all fail from the browser.
  - `https://` hosts are attempted on demand and mostly refuse the browser. The card then states that
    plainly and still shows the on-chain identity with a link to the file.
- Ethereum registrations are infrequent; expect a handful per 10k blocks (~33h).
