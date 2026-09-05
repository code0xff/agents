import { useEffect, useState } from 'react'

export const ROUTES = ['overview', 'payments', 'registry', 'marketplaces'] as const
export type Route = (typeof ROUTES)[number]

const DEFAULT: Route = 'overview'

function parse(hash: string): Route {
  const slug = hash.replace(/^#\/?/, '').split('?')[0]
  return (ROUTES as readonly string[]).includes(slug) ? (slug as Route) : DEFAULT
}

export const hrefFor = (r: Route) => `#/${r}`

/**
 * Hash routing. GitHub Pages serves static files only, so a hash keeps deep links working
 * without a 404 redirect dance, and it behaves the same offline inside the service worker.
 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
