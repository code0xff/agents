# PWA and mobile

## Installability
`vite-plugin-pwa` generates `manifest.webmanifest` and a Workbox service worker at build time.
`start_url` and `scope` follow Vite's `base`, so they stay correct under the GitHub Pages sub-path.
Icons live in `public/`: `favicon.svg` plus 192/512 PNGs and maskable variants, generated from the SVG
by the snippet in `scripts/` history (re-run with `sharp` if the mark changes).

`registerType: 'autoUpdate'` means a new deploy replaces the old service worker without a prompt, and
the page reloads once it takes control.

Registration is done by `src/lib/registerPwa.ts` rather than the script vite-plugin-pwa injects
(`injectRegister: null`). The injected script only calls `register()`: it never asks an existing
registration to look for a new build, so a tab left open, or a returning visitor served the precached
shell, kept running the deploy it started with. This is what made a shipped fix look unshipped. The
module registers through `virtual:pwa-register`, which reloads when the new worker takes control, and
re-checks hourly and whenever the tab becomes visible again.
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

## Applying an update
The worker is generated in `autoUpdate` mode with `skipWaiting` and `clientsClaim`, so a new build
takes control of open tabs as soon as it installs. What it must not do is reload the page while
someone is reading it. Left to itself that is exactly what it did: `vite-plugin-pwa`'s autoUpdate
registration ends in

```js
wb.addEventListener('activated', e => {
  (e.isUpdate || e.isExternal) && (onNeedReload ? onNeedReload() : window.location.reload())
})
```

and with no `onNeedReload` the reload is unconditional. Because `registerPwa` asks for an update on
every `visibilitychange`, the sequence was: return to the tab, check starts, route paints, worker
activates a second or two later, document reloads and comes back on the same hash. It read as the
page refreshing itself for no reason, and it was intermittent because it needs a new build to exist.

`src/lib/registerPwa.ts` now passes `onNeedReload` and decides the moment itself:

| Tab state when the build activates | What happens |
|---|---|
| Hidden | Reload immediately — nobody is looking |
| Visible | A filled button appears in the header; the reload waits for it, or for the tab to be hidden |

`onNeedRefresh` is the wrong hook: it is the prompt-mode callback and autoUpdate never reads it.

The button is in the header bar at both breakpoints rather than inside the mobile menu, because a
build waiting behind a closed hamburger announces nothing.

## Mobile
- Layout breakpoints follow Tailwind defaults. The header stacks below `lg`, and the locale switch
  shows two-letter codes below `sm`.
- `Stat` drops to `text-lg` and truncates so long currency values never widen the grid.
- Registry rows stack onto two lines below `sm`; the agent name takes its own line.
- The payment graph height steps 300 → 380 → 420px and re-centers via `ResizeObserver`.
- Scrolling is the browser's own on every device; see `docs/design.md`.
- `viewport-fit=cover` plus the theme-color meta, kept in sync by `applyTheme`, colors the browser
  chrome and the installed app's status bar.

## Pagination
`components/Pagination.tsx` provides `usePagination(items, pageSize)` and a `<Pagination>` control.
Page size is 8 (registry) and 6 (payments) on mobile, 12 and 10 from `sm` up. Pagination replaced the
inner scroll containers, so the page has a single scroll axis on touch devices.

`usePagination` takes a `resetKey` naming what the list is of, and returns to page one when it
changes. Without it, switching chains kept the page number from the previous chain, so a reader who
had paged into Base landed mid-way through BNB. The reset happens during render, not from an effect,
so the new list never paints at the old page number first.

Because both lists update live, the current page is clamped when the list shrinks, and the registry
panel shows a "N new" button while the reader is off page one so a shifting list stays explainable.

Paginated rows are not wrapped in `AnimatePresence`. An exit animation keeps the outgoing rows mounted
until it finishes, so a page change briefly rendered twice the page size before settling back. Rows
still animate in on mount; only the exit was removed.
