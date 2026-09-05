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
  commits `public/snapshots` and `data/snapshot-state` to `dev`. Requires Settings → Actions →
  Workflow permissions set to **Read and write** (already configured).
- A push made with `GITHUB_TOKEN` does **not** trigger other workflows, so the snapshot commit cannot
  start the push-based deploy. `deploy.yml` therefore also accepts `workflow_call`, and the snapshot
  job invokes it directly when the data changed. `deploy.yml` checks out `ref: dev` rather than the
  triggering SHA so the just-made snapshot commit is included.
- A scheduled workflow only runs from the default branch, and GitHub registers a workflow when the file
  lands on that branch. If a schedule never fires, push a change to the workflow file to re-register it.
- Local check: `VITE_BASE=/agents/ npm run build && npm run preview`
