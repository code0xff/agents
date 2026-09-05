import { useEffect, useState } from 'react'

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
