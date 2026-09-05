import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registers the service worker in autoUpdate mode, which activates a new build and reloads.
 *
 * The register script vite-plugin-pwa injects only calls `register()`; it never asks an existing
 * registration to look for a new build. A tab that stays open, or a returning visitor served the
 * precached shell, therefore keeps running the deploy it started with. Checking on an interval and
 * whenever the tab becomes visible again closes that gap.
 */
export function registerPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => { void registration.update() }
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
