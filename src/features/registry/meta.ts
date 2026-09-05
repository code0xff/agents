import { parseAgentURI } from '../../lib/format'

export interface AgentService { name: string; endpoint: string }
export interface AgentRegistration { agentId?: string; agentRegistry?: string }

/** The subset of an ERC-8004 registration file this app renders. */
export interface AgentMeta {
  name?: string
  description?: string
  image?: string
  services: AgentService[]
  supportedTrust: string[]
  x402Support?: boolean
  active?: boolean
  registrations: AgentRegistration[]
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** On-chain documents are written by anyone, so every field is checked before it is rendered. */
export function normalizeAgentMeta(raw: unknown): AgentMeta {
  const d = (raw ?? {}) as Record<string, unknown>
  return {
    name: str(d.name),
    description: str(d.description),
    image: str(d.image),
    services: arr(d.services)
      .map((s) => {
        const o = (s ?? {}) as Record<string, unknown>
        const endpoint = str(o.endpoint)
        return endpoint ? { name: str(o.name) ?? endpoint, endpoint } : null
      })
      .filter(Boolean) as AgentService[],
    supportedTrust: arr(d.supportedTrust).map(str).filter(Boolean) as string[],
    x402Support: bool(d.x402Support),
    active: bool(d.active),
    registrations: arr(d.registrations).map((r) => {
      const o = (r ?? {}) as Record<string, unknown>
      return {
        agentId: str(o.agentId) ?? (typeof o.agentId === 'number' ? String(o.agentId) : undefined),
        agentRegistry: str(o.agentRegistry),
      }
    }),
  }
}

/**
 * Pinata is the one public IPFS gateway measured to send CORS headers, so it is what an
 * `ipfs://` document is read through. Everything else is returned unchanged and simply
 * attempted; most https hosts block the browser and the caller falls back to a link.
 */
export function resolveMetaUrl(uri: string): string | null {
  if (uri.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri
  return null
}

export type MetaFetch =
  | { status: 'inline'; meta: AgentMeta }
  | { status: 'ok'; meta: AgentMeta }
  | { status: 'none' }
  | { status: 'blocked' }

/** Reads a registration file on demand. Inline `data:` documents never touch the network. */
export async function fetchAgentMeta(uri: string, signal?: AbortSignal): Promise<MetaFetch> {
  const inline = parseAgentURI(uri)
  if (inline) return { status: 'inline', meta: normalizeAgentMeta(inline) }
  const url = resolveMetaUrl(uri)
  if (!url) return { status: 'none' }
  try {
    const r = await fetch(url, { signal })
    if (!r.ok) return { status: 'blocked' }
    return { status: 'ok', meta: normalizeAgentMeta(await r.json()) }
  } catch {
    return { status: 'blocked' }
  }
}
