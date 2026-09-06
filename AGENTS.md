# Agent Economy Observatory — AGENTS.md

A backend-less dashboard that visualizes the AI agent economy (marketplaces, ERC-8004 registrations,
x402 payments) by reading public data directly from the browser. Deployed to GitHub Pages.

## Ground rules (always follow)

1. **No backend.** All data comes from public RPCs, public APIs, or static JSON fetched by the browser.
   No servers, databases, or serverless functions. No secret keys (they would ship in the bundle).
2. **Research before building.** Before implementing any feature, record findings in `docs/research/`:
   data sources, access method, and constraints (CORS, rate limits, auth). Do not write code without
   research. Process in `docs/workflow.md`.
3. **Marketplaces are more than a list.** Do not stop at name/URL. For every marketplace, check whether
   more data can be pulled (new agents, payment/transaction events, categories, reputation) via API,
   on-chain events, RSS, or public pages, and surface what is available.
4. **UI is monotone, refined, futuristic.** Only achromatic tokens (`ink-*`); emphasis through luminance.
   Light and dark themes are both supported, so never hardcode hex colors — use tokens (`ink-*`,
   `var(--ink-N)`) only. Guide in `docs/design.md`.
5. **Use animation libraries, do not hand-roll.** motion (Framer Motion), GSAP, Lenis, D3 transitions.
   Keep custom keyframes to a minimum.
6. **Tailwind v4 first.** Avoid separate CSS files and CSS-in-JS. Tokens live in `@theme` in `src/index.css`.
7. **Static-deploy compatible.** Routing, paths, and env vars must work under the GitHub Pages `base` path.
8. **Four languages.** All user-facing UI strings go through `src/i18n` (en, ko, ja, zh). No literal UI
   strings in components. Documentation and code comments are written in English.
9. **Branch: `dev`.** `dev` is the default and only managed branch; deploys run from `dev`.
10. **Mobile first.** Every panel must work at 360px wide with no horizontal overflow. Long lists are
    paginated rather than nested in their own scroll area. See `docs/pwa.md`.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind v4 · motion · GSAP · Lenis · D3 · viem/wagmi · TanStack Query

## Documentation index (look here for details)

| File | Contents |
|---|---|
| `docs/workflow.md` | Development process: research → design → implement → verify. Research template |
| `docs/architecture.md` | Directory layout, data flow, state management, module boundaries |
| `docs/design.md` | Design system: color tokens, theming, typography, motion principles, component rules |
| `docs/i18n.md` | Localization: supported locales, how to add strings, locale detection |
| `docs/pwa.md` | PWA manifest, service worker caching, mobile layout rules, pagination |
| `docs/data-sources.md` | Data source catalog: chain RPCs, contract addresses, public APIs, constraints |
| `docs/deploy.md` | GitHub Pages deployment, `base` path, SPA fallback, env vars, snapshot workflow |
| `docs/features/marketplaces.md` | Feature 1: marketplace directory + extra data collection |
| `docs/features/registry.md` | Feature 2: ERC-8004 agent registration event log |
| `docs/features/payments.md` | Feature 3: facilitator-centric x402 payment flow graph |
| `docs/features/*.md` "Implementation" section | Current implementation status and next steps per feature |
| `scripts/snapshot.mjs` | CI snapshot collector (CORS-blocked sources → `public/snapshots/`) |
| `docs/review-2026-09.md` | Code audit findings and what was fixed or deferred |
| `docs/research/` | Pre-implementation research per feature (required). registry / payments / marketplaces done |

## License
Apache 2.0. New source files do not carry per-file headers; `LICENSE` at the root covers the project.

## Commands

```
npm run dev      # local development
npm run build    # tsc + vite build → dist/
npm run preview  # preview the build
npm run lint     # oxlint
node scripts/snapshot.mjs  # refresh data snapshots locally
```
