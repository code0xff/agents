import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_MS = 60 * 60 * 1000

let ready = false
const listeners = new Set<() => void>()

/** Reloading is all that is left to do: the new worker is already in control. */
export const applyUpdate = () => window.location.reload()
export const updateReady = () => ready

export function subscribeUpdate(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/**
 * A new build has activated. In autoUpdate mode vite-plugin-pwa would reload here on its own,
 * which pulled the page out from under whoever was reading it: the route repainted, then a
 * second later the whole document reloaded and came back on the same hash, so it read as the
 * page refreshing itself for no reason. `onNeedReload` is the hook that takes that decision
 * back — `onNeedRefresh` is the prompt-mode callback and autoUpdate never reads it.
 *
 * The build is still taken as soon as it can be taken without being noticed — the moment the
 * tab is hidden. While it is visible the header says a build is waiting and the reader decides.
 */
function announce() {
  if (ready) return
  ready = true
  if (document.visibilityState === 'hidden') { applyUpdate(); return }
  for (const fn of listeners) fn()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') applyUpdate()
  })
}

/**
 * Registers the service worker.
 *
 * The register script vite-plugin-pwa injects only calls `register()`; it never asks an existing
 * registration to look for a new build. A tab that stays open, or a returning visitor served the
 * precached shell, therefore keeps running the deploy it started with. Checking on an interval and
 * whenever the tab becomes visible again closes that gap.
 */
export function registerPwa() {
  registerSW({
    immediate: true,
    onNeedReload: announce,
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
