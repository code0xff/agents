# Architecture

## Directory layout

```
src/
  main.tsx              # entry, QueryClientProvider, I18nProvider
  App.tsx               # layout shell, theme + locale toggles
  index.css             # Tailwind + @theme tokens
  i18n/                 # locale dictionaries and useT() hook
  components/           # shared UI (Panel, Stat, ThemeToggle, LocaleSwitch ...)
  lib/                  # clients.ts (viem clients), format.ts, theme.ts
  data/                 # static data: marketplaces.json, facilitators.json, chains.ts
  features/
    marketplaces/       # feature 1
    registry/           # feature 2
    payments/           # feature 3
docs/                   # documentation
public/404.html         # GitHub Pages SPA fallback
public/snapshots/       # CI-generated snapshot JSON (fetched by the browser)
data/snapshot-state/    # diff state for snapshots (committed, not deployed)
scripts/snapshot.mjs    # snapshot collector
```

## Data flow

Browser → (viem) public RPC `getLogs` / `getBlock`
Browser → (fetch) public REST APIs (only those with CORS enabled)
Static JSON (`src/data/`) → bundled at build time
Snapshot JSON (`public/snapshots/`) → produced by CI, fetched at runtime

All remote calls are wrapped in TanStack Query or a polling hook. Polling intervals are defined per
feature doc.

## State

Server state: TanStack Query / polling hooks. UI state: React local state. Theme and locale: small
hooks backed by `localStorage`. No global store unless needed.

## Chain clients

`src/lib/clients.ts` creates one viem `PublicClient` per chain from `src/data/chains.ts`. RPC URLs
come from `VITE_RPC_*` env vars with public defaults, combined with `fallback()`.
