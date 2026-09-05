# PWA and mobile

## Installability
`vite-plugin-pwa` generates `manifest.webmanifest` and a Workbox service worker at build time.
`start_url` and `scope` follow Vite's `base`, so they stay correct under the GitHub Pages sub-path.
Icons live in `public/`: `favicon.svg` plus 192/512 PNGs and maskable variants, generated from the SVG
by the snippet in `scripts/` history (re-run with `sharp` if the mark changes).

`registerType: 'autoUpdate'` means a new deploy replaces the old service worker without a prompt.
`usePwa()` exposes the deferred `beforeinstallprompt` event, which drives the Install button in the
header, and the online/offline state, which drives the Offline badge.

## Caching strategy
| Target | Strategy | Why |
|---|---|---|
| App shell (js, css, html, icons) | precache | Instant load and offline start |
| `public/snapshots/*.json` | NetworkFirst, 6s timeout, 7d | Refreshed by CI every 6h; must not go stale behind a service worker update |
| agenteconomy.to, onchainagentintel.io | NetworkFirst, 6s timeout, 6h | Aggregates tolerate staleness; keeps the dashboard usable offline |
| Google Fonts CSS | StaleWhileRevalidate | Rarely changes |
| Google Fonts files | CacheFirst, 1y | Immutable |

Cache names are prefixed `aeo-`. Every GitHub Pages project of an account is served from the same
origin, so unprefixed names would collide with the account's other apps. The same reason is why the
`localStorage` keys are `aeo-theme` and `aeo-locale`.

RPC calls are POST requests, which Workbox does not cache. Live panels therefore show their empty or
error state when offline, while aggregates and snapshots still render.

## Mobile
- Layout breakpoints follow Tailwind defaults. The header stacks below `lg`, and the locale switch
  shows two-letter codes below `sm`.
- `Stat` drops to `text-lg` and truncates so long currency values never widen the grid.
- Registry rows stack onto two lines below `sm`; the agent name takes its own line.
- The payment graph height steps 300 → 380 → 420px and re-centers via `ResizeObserver`.
- Lenis smooth scrolling is enabled only for `(min-width: 768px) and (pointer: fine)`. On touch the
  native momentum scroll is used instead, which also avoids fighting nested scroll areas.
- `viewport-fit=cover` plus the theme-color meta, kept in sync by `applyTheme`, colors the browser
  chrome and the installed app's status bar.

## Pagination
`components/Pagination.tsx` provides `usePagination(items, pageSize)` and a `<Pagination>` control.
Page size is 8 (registry) and 6 (payments) on mobile, 12 and 10 from `sm` up. Pagination replaced the
inner scroll containers, so the page has a single scroll axis on touch devices.

Because both lists update live, the current page is clamped when the list shrinks, and the registry
panel shows a "N new" button while the reader is off page one so a shifting list stays explainable.
