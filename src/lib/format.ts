export const short = (addr: string, n = 4) => `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`

/** Compact relative duration, e.g. "12s", "3m", "5h", "2d". Unit letters stay ASCII on purpose. */
export function timeAgo(ts: number | Date | string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export const compact = (n: number, tag = 'en') =>
  new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const usd = (n: number, digits = 2, tag = 'en') =>
  new Intl.NumberFormat(tag, { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n)

export const num = (n: number, tag = 'en') => new Intl.NumberFormat(tag).format(n)

/** Parse a registration file from a data: URI or an inline JSON string. Null on failure. */
export function parseAgentURI(uri: string): Record<string, unknown> | null {
  if (!uri) return null
  try {
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(',')
      const meta = uri.slice(5, comma)
      const payload = uri.slice(comma + 1)
      const text = meta.includes('base64') ? atob(payload) : decodeURIComponent(payload)
      return JSON.parse(text)
    }
    if (uri.trim().startsWith('{')) return JSON.parse(uri)
  } catch { /* ignore */ }
  return null
}
