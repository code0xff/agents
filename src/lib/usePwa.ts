import { useEffect, useState, useSyncExternalStore } from 'react'
import { applyUpdate, subscribeUpdate, updateReady } from './registerPwa'

/**
 * Online state for the offline indicator. Installation is left to the browser's own
 * prompt, so the deferred beforeinstallprompt event is not intercepted here.
 */
export function usePwa() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return { online }
}

/** Re-exported so components read the service worker through one module. */
export { applyUpdate }

/** True once a newer build has activated and is waiting for a reload. Never resets. */
export const usePwaUpdate = () => useSyncExternalStore(subscribeUpdate, updateReady, () => false)
