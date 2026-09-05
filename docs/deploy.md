# Deployment (GitHub Pages)

- Repository: https://github.com/code0xff/agents (public; Pages requires public on the free plan)
- Branch: `dev` is the default branch; the deploy workflow runs on every push to `dev`.
- Live URL: https://code0xff.github.io/agents/
- Workflow: `.github/workflows/deploy.yml` — builds and publishes to Pages.
- In the repository settings set Pages → Source to **GitHub Actions**.
- `base` path: `vite.config.ts` reads `VITE_BASE` (default `/agents/`). CI injects the repository name.
  For a custom domain or a `<user>.github.io` repo use `VITE_BASE=/`.
- SPA fallback: `public/404.html` forwards the path as `?p=` and redirects. If a router is added, restore
  the path from that query.
- Only `VITE_`-prefixed env vars are bundled. Never put secrets in them.
- Snapshot workflow `.github/workflows/snapshot.yml`: every 6 hours runs `scripts/snapshot.mjs` and
  commits `public/snapshots` and `data/snapshot-state` to `dev`, which triggers a deploy. Set
  Settings → Actions → Workflow permissions to **Read and write**.
- Local check: `VITE_BASE=/agents/ npm run build && npm run preview`
