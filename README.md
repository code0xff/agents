# Agent Economy Observatory

A dashboard for the AI agent economy that reads public chain data directly in the browser.
No server, no database, no API keys.

**[code0xff.github.io/agents](https://code0xff.github.io/agents/)**

Agents are starting to register identities on-chain and pay each other for services. Two standards
carry most of that traffic: ERC-8004 for agent identity and x402 for HTTP-native stablecoin payments.
This page watches both as they happen and tries to answer where the activity actually sits.

## What it shows

**Overview** pairs each headline number with its 7-day momentum, then answers where activity
concentrates: which facilitator settles the most payments, which chains those payments run on, and
which chains hold the registered agents.

**Payments** draws every USDC settlement a facilitator submits on Base and Polygon, as it lands, as a
flow from payer through facilitator to the receiving service. One chain at a time, because the two
networks never settle with each other. Solana is reported separately, as a sample.

**Registry** streams ERC-8004 registrations from Base and BNB. Opening a row parses the agent's
registration file into a card: name, description, services, trust models, and its on-chain identity.

**Marketplaces** lists where agents and paid services are published, with what each one exposes and
how much of it can be read.

## How the data is obtained

Everything runs in the browser. There are three kinds of source, and the interface says which is which.

| Kind | How | Where |
|---|---|---|
| Live | Public RPC, read directly | ERC-8004 logs on Base and BNB; x402 settlements on Base and Polygon |
| Sampled | Public RPC, but not exhaustive | Solana settlement rate, from known facilitators' signatures |
| Aggregate | Public APIs with CORS | Totals and trends from agenteconomy.to and onchainagentintel.io |
| Snapshot | Fetched by CI, committed as JSON | Sources that block the browser: the CDP and PayAI bazaars, agentscan |

x402 settlements are found from USDC's `AuthorizationUsed` log, which the token emits only from a
successful EIP-3009 call. That makes the log set exactly the settlements, and it costs about 6 MB an
hour instead of the 443 MB an hour that scanning whole blocks did.

Sources are catalogued in [`docs/data-sources.md`](docs/data-sources.md), and every one of them was
measured before being used. The measurements live in [`docs/research/`](docs/research/).

## Running it

```
npm install
npm run dev
```

`npm run build` type-checks and builds to `dist/`. `npm run preview` serves that build.
`node scripts/snapshot.mjs` refreshes the CI snapshots locally.

Public RPC endpoints have defaults and can be overridden; see `.env.example`. Only `VITE_`-prefixed
variables reach the bundle, so nothing secret belongs there.

## Built with

Vite, React, TypeScript, Tailwind, viem for chain reads, D3 for the flow graph, motion for animation,
TanStack Query for the aggregate feeds. Installable as a PWA, works offline for everything except the
live feeds, in English, Korean, Japanese and Chinese, light and dark.

## Documentation

[`AGENTS.md`](AGENTS.md) holds the project's ground rules and indexes the rest. In short: no backend,
research a source before building on it, achromatic tokens only, and every user-facing string goes
through `src/i18n`.

## License

[Apache 2.0](LICENSE).
