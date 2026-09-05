/** Caught values are not guaranteed to be Errors; never assume `.message` exists. */
export const errMessage = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).split('\n')[0]

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

/** Reads a field only when it is actually a string; on-chain JSON is untrusted. */
export const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/** Parse a registration file from a data: URI or an inline JSON string. Null on failure. */
export function parseAgentURI(uri: string): Record<string, unknown> | null {
  if (!uri) return null
  try {
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(',')
      const meta = uri.slice(5, comma)
      const payload = uri.slice(comma + 1)
      let text: string
      if (meta.includes('base64')) {
        const bytes = Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0))
        text = new TextDecoder().decode(bytes)
      } else {
        text = decodeURIComponent(payload)
      }
      return JSON.parse(text)
    }
    if (uri.trim().startsWith('{')) return JSON.parse(uri)
  } catch { /* ignore */ }
  return null
}
