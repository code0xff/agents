import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Short build id, shown in the footer so a stale service worker is diagnosable at a glance. */
function buildId(): string {
  // The deploy workflow checks out the tip of dev, which can be ahead of the SHA that
  // triggered it, so the working tree is the accurate source.
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch { /* not a repo */ }
  return process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'
}

// GitHub Pages: the repository name becomes the base path. Use '/' for a custom domain or user page.
const base = process.env.VITE_BASE ?? '/agents/'

export default defineConfig({
  base,
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/lib/registerPwa.ts so a new deploy can also be picked up by an
      // already-open tab; the injected script only registers and never re-checks.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Agent Economy Observatory',
        short_name: 'Observatory',
        description: 'Marketplaces, ERC-8004 registrations and x402 payments, read from public chain data.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#050505',
        theme_color: '#050505',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // GitHub Pages serves every project from one origin, so cache names must be
        // project-scoped or they collide with the account's other Pages apps.
        // Snapshots are handled at runtime so they refresh without a service worker update.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['**/snapshots/**', '**/404.html'],
        navigateFallbackDenylist: [new RegExp(`^${base}snapshots/`)],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // CI snapshot data, same origin.
            urlPattern: ({ url }) => url.pathname.includes('/snapshots/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aeo-snapshots',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Public aggregate APIs (CORS-enabled GETs).
            urlPattern: ({ url }) =>
              url.hostname === 'dashboard.agenteconomy.to' || url.hostname === 'api.onchainagentintel.io',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aeo-aggregates',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'aeo-google-fonts-styles',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'aeo-google-fonts-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
