import * as d3 from 'd3'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { short } from '../../lib/format'
import { facilitatorLabel, type Payment } from './usePayments'

type Kind = 'facilitator' | 'payer' | 'payTo'
/** Keyed by role as well as address: the same address can act in several roles at once,
 *  and a single shared node would flip its colour, size and label between them. */
interface Node extends d3.SimulationNodeDatum { id: string; addr: string; chain: string; kind: Kind; label: string; operator?: string | null; weight: number }
/** Chain is part of the identity: the same address on two chains is two actors. */
const nodeId = (chain: string, kind: Kind, addr: string) => `${chain}:${kind}:${addr}`
interface Link extends d3.SimulationLinkDatum<Node> { id: string; source: string | Node; target: string | Node; weight: number }

const WINDOW_DESKTOP = 120
const WINDOW_MOBILE = 40

/** The layout is drawn on a canvas larger than the panel and viewed through it, so nodes
 *  can spread out instead of being packed into the visible rectangle. */
const CANVAS_SCALE = 1.9
/** How long the camera leaves the reader alone after they pan or zoom. */
const USER_CONTROL_MS = 9_000
const FOLLOW_MS = 1_400

export function PaymentGraph({ payments, compact = false }: { payments: Payment[]; compact?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sim = useRef<d3.Simulation<Node, Link> | null>(null)
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const linksRef = useRef<Map<string, Link>>(new Map())
  const lastKey = useRef<string | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const shapeRef = useRef('')
  const userMovedAt = useRef(0)
  const compactRef = useRef(compact)
  // Touch has to be claimed explicitly. Filtering to two fingers does not work: d3-zoom
  // never registers the first touch, so it cannot form a pinch, and `touch-action: pan-y`
  // lets the browser steal the gesture as soon as it moves vertically.
  const [touchMap, setTouchMap] = useState(false)
  const touchMapRef = useRef(false)

  const recent = useMemo(() => payments.slice(0, compact ? WINDOW_MOBILE : WINDOW_DESKTOP), [payments, compact])

  // The camera filter reads this from an event handler, so it is synchronised in an effect
  // rather than during render.
  useEffect(() => { compactRef.current = compact }, [compact])
  useEffect(() => { touchMapRef.current = touchMap }, [touchMap])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((s) => (Math.abs(s.w - width) > 8 || Math.abs(s.h - height) > 8 ? { w: width, h: height } : s))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Camera. Set up once; panning and zooming apply a transform to the whole scene.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const svg = d3.select(el)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.5])
      // d3 otherwise decides whether to bind touch handlers from a capability sniff at call
      // time. The gate that matters is the toggle in `filter`, so bind them unconditionally.
      .touchable(() => true)
      .filter((event: Event) => {
        // Dragging a node must not also drag the camera.
        if ((event.target as Element).closest?.('g.n')) return false
        // The graph fills most of the viewport, so a plain wheel has to keep scrolling the page;
        // taking it stopped the page dead wherever the pointer crossed the map. A modifier zooms,
        // which is also how a trackpad pinch arrives.
        if (event.type === 'wheel') {
          const e = event as WheelEvent
          return e.ctrlKey || e.metaKey
        }
        // The graph sits inside a scrolling page, so touch reaches the map only while the
        // reader has claimed it. A mouse always drives the map.
        if (event.type.startsWith('touch')) return touchMapRef.current
        return true
      })
      .on('start', (event) => { if (event.sourceEvent) userMovedAt.current = Date.now() })
      .on('zoom', (event) => svg.select('g.scene').attr('transform', event.transform.toString()))
    zoomRef.current = zoom
    svg.call(zoom)
    return () => { svg.on('.zoom', null) }
  }, [])

  const nudgeZoom = useCallback((factor: number) => {
    const el = ref.current, zoom = zoomRef.current
    if (!el || !zoom) return
    userMovedAt.current = Date.now()
    d3.select(el).transition().duration(220).call(zoom.scaleBy, factor)
  }, [])

  const resetView = useCallback(() => {
    const el = ref.current, zoom = zoomRef.current
    if (!el || !zoom) return
    const { width, height } = el.getBoundingClientRect()
    const W = width * CANVAS_SCALE, H = height * CANVAS_SCALE
    // Reset also hands the camera back to the follower.
    userMovedAt.current = 0
    d3.select(el).transition().duration(400)
      .call(zoom.transform, d3.zoomIdentity.translate((width - W) / 2, (height - H) / 2))
  }, [])

  // Nodes, links and layout, on the enlarged canvas.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const svg = d3.select(el)
    const { width, height } = el.getBoundingClientRect()
    if (!width || !height) return
    const W = width * CANVAS_SCALE
    const H = height * CANVAS_SCALE

    const nodes = nodesRef.current, links = linksRef.current
    const keep = new Set<string>(), keepL = new Set<string>()
    const up = (chain: string, kind: Kind, addr: string, label: string, operator?: string | null) => {
      const id = nodeId(chain, kind, addr)
      let n = nodes.get(id)
      if (!n) { n = { id, addr, chain, kind, label, weight: 0, x: W / 2 + (Math.random() - 0.5) * 160, y: H / 2 + (Math.random() - 0.5) * 160 }; nodes.set(id, n) }
      n.label = label; n.operator = operator ?? n.operator; keep.add(id); return n
    }
    const upL = (a: string, b: string) => { const id = `${a}>${b}`; if (!links.has(id)) links.set(id, { id, source: a, target: b, weight: 0 }); keepL.add(id) }

    // d3-force requires stable, mutable node objects across ticks, so the maps below are
    // updated in place rather than rebuilt. `recent` itself is only ever read.
    for (const p of recent) {
      up(p.chain, 'facilitator', p.facilitator, facilitatorLabel(p), p.facilitatorName)
      up(p.chain, 'payer', p.payer, short(p.payer))
      up(p.chain, 'payTo', p.payTo, short(p.payTo))
      upL(nodeId(p.chain, 'payer', p.payer), nodeId(p.chain, 'facilitator', p.facilitator))
      upL(nodeId(p.chain, 'facilitator', p.facilitator), nodeId(p.chain, 'payTo', p.payTo))
    }
    for (const id of nodes.keys()) if (!keep.has(id)) nodes.delete(id)
    for (const id of links.keys()) if (!keepL.has(id)) links.delete(id)
    // Weights describe the current window only, so both maps reset before re-counting.
    for (const n of nodes.values()) n.weight = 0
    for (const l of links.values()) l.weight = 0
    for (const p of recent) {
      nodes.get(nodeId(p.chain, 'facilitator', p.facilitator))!.weight += 3
      nodes.get(nodeId(p.chain, 'payer', p.payer))!.weight += 1
      nodes.get(nodeId(p.chain, 'payTo', p.payTo))!.weight += 1
      links.get(`${nodeId(p.chain, 'payer', p.payer)}>${nodeId(p.chain, 'facilitator', p.facilitator)}`)!.weight += 1
      links.get(`${nodeId(p.chain, 'facilitator', p.facilitator)}>${nodeId(p.chain, 'payTo', p.payTo)}`)!.weight += 1
    }

    const N = [...nodes.values()], L = [...links.values()]
    if (!sim.current) {
      sim.current = d3.forceSimulation<Node, Link>()
        // Repulsion is deliberately mild and the pull to centre firm. Strong repulsion drove
        // every node onto the boundary, so the cluster took the shape of whatever bound it
        // hit instead of settling into one of its own.
        .force('charge', d3.forceManyBody<Node>().strength((d) => d.kind === 'facilitator' ? -400 : -140).distanceMax(500))
        .force('collide', d3.forceCollide<Node>().radius((d) => r(d) + 12))
        .alphaDecay(0.025)
        .velocityDecay(0.42)
    }
    const s = sim.current
    s.nodes(N)
    s.force('link', d3.forceLink<Node, Link>(L).id((d) => d.id)
      .distance((l) => ((l.source as Node).kind === 'facilitator' || (l.target as Node).kind === 'facilitator') ? 140 : 85)
      .strength(0.16))
    // forceCenter shifts every node each tick to keep the centroid fixed, which fights the
    // radial pull and makes the whole cluster slide. The x/y forces alone hold the centre.
    s.force('center', null)
    s.force('x', d3.forceX(W / 2).strength(0.03))
    s.force('y', d3.forceY(H / 2).strength(0.042))

    // Reheat only when the cast actually changed. Re-running the layout on every poll made
    // the graph rearrange under the reader, including right after they panned.
    const shape = N.map((n) => n.id).join('|')
    const changed = shape !== shapeRef.current
    shapeRef.current = shape
    if (changed) s.alpha(Math.min(0.45, 0.12 + N.length * 0.004)).restart()
    else if (s.alpha() < s.alphaMin()) s.alpha(0.02).restart()

    const scene = svg.select<SVGGElement>('g.scene')

    // Geometry and visibility are set directly rather than through a transition: a transition
    // that never runs (throttled tab, reduced motion) would leave the graph blank.
    const link = scene.select('g.links').selectAll<SVGLineElement, Link>('line').data(L, (d) => d.id)
    link.exit().remove()
    const linkE = link.enter().append('line').attr('stroke', 'var(--ink-200)').attr('opacity', 0.16)
    const linkAll = linkE.merge(link).attr('stroke-width', (d) => Math.min(3, 0.6 + d.weight * 0.3))

    const node = scene.select('g.nodes').selectAll<SVGGElement, Node>('g.n').data(N, (d) => d.id)
    node.exit().remove()
    const nodeE = node.enter().append('g').attr('class', 'n').attr('opacity', 1)
    nodeE.append('circle')
    nodeE.append('text').attr('dy', -10).attr('text-anchor', 'middle').attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 9)
    const nodeAll = nodeE.merge(node)
    nodeAll.select('circle')
      .attr('fill', (d) => d.kind === 'facilitator' ? 'var(--ink-50)' : d.kind === 'payTo' ? 'var(--ink-300)' : 'var(--ink-600)')
      .attr('stroke', (d) => d.kind === 'payer' ? 'var(--ink-400)' : 'none').attr('stroke-width', 1)
      .attr('r', r)
    const minFacWeight = compact ? 6 : 0
    nodeAll.select('text')
      .text((d) => d.kind === 'facilitator' ? (d.weight >= minFacWeight ? d.label : '')
        : d.kind === 'payTo' && !compact && d.weight >= 3 ? d.label : '')
      .attr('fill', (d) => d.kind === 'facilitator' ? 'var(--ink-50)' : 'var(--ink-300)')
    nodeAll.call(d3.drag<SVGGElement, Node>()
      .on('start', (ev, d) => { if (!ev.active) s.alphaTarget(0.3).restart(); userMovedAt.current = Date.now(); d.fx = d.x; d.fy = d.y })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y })
      .on('end', (ev, d) => { if (!ev.active) s.alphaTarget(0); d.fx = null; d.fy = null }))
    nodeAll.select('title').remove()
    nodeAll.append('title').text((d) => `${d.chain} ${d.kind} ${d.addr}${d.operator ? ` — ${d.operator}` : ''}`)

    // Bounded to an ellipse rather than the canvas rectangle. A rectangular bound lets the
    // layout fill the corners, which reads as a box; an elliptical one keeps the cluster
    // organic. The camera, not the bound, is what keeps the interesting part in view.
    const cxC = W / 2, cyC = H / 2
    const RX = W / 2 - 24, RY = H / 2 - 24
    const contain = (d: Node) => {
      const nx = ((d.x ?? cxC) - cxC) / RX
      const ny = ((d.y ?? cyC) - cyC) / RY
      const dist = Math.hypot(nx, ny)
      if (dist > 1) {
        d.x = cxC + (nx / dist) * RX
        d.y = cyC + (ny / dist) * RY
      }
    }
    s.on('tick', () => {
      for (const n of N) contain(n)
      linkAll.attr('x1', (d) => (d.source as Node).x!).attr('y1', (d) => (d.source as Node).y!).attr('x2', (d) => (d.target as Node).x!).attr('y2', (d) => (d.target as Node).y!)
      nodeAll.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // Start centred on the canvas rather than at its top-left corner.
    const zoom = zoomRef.current
    if (zoom && !svg.property('__framed')) {
      svg.property('__framed', true)
      svg.call(zoom.transform, d3.zoomIdentity.translate((width - W) / 2, (height - H) / 2))
    }
  }, [recent, size, compact])

  // The camera drifts toward wherever the newest settlements are, unless the reader
  // has just taken control.
  useEffect(() => {
    const el = ref.current
    const zoom = zoomRef.current
    if (!el || !zoom || payments.length === 0) return
    if (Date.now() - userMovedAt.current < USER_CONTROL_MS) return
    const { width, height } = el.getBoundingClientRect()
    if (!width || !height) return

    const focus = payments.slice(0, 6)
    const pts: Node[] = []
    for (const p of focus) {
      const f = nodesRef.current.get(nodeId(p.chain, 'facilitator', p.facilitator))
      const to = nodesRef.current.get(nodeId(p.chain, 'payTo', p.payTo))
      if (f?.x != null) pts.push(f)
      if (to?.x != null) pts.push(to)
    }
    if (pts.length === 0) return
    const cx = d3.mean(pts, (p) => p.x!)!
    const cy = d3.mean(pts, (p) => p.y!)!
    const k = d3.zoomTransform(el).k
    const target = d3.zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k)
    d3.select(el).transition().duration(FOLLOW_MS).ease(d3.easeCubicInOut).call(zoom.transform, target)
  }, [payments])

  // Emit a particle along the edges for every new payment
  useEffect(() => {
    const p = payments[0]
    if (!p || p.key === lastKey.current) return
    const fresh = lastKey.current ? payments.slice(0, payments.findIndex((x) => x.key === lastKey.current)) : payments.slice(0, 6)
    lastKey.current = p.key
    const g = d3.select(ref.current!).select<SVGGElement>('g.fx')
    fresh.slice(0, 12).forEach((pay, i) => {
      const hop = (a: string, b: string, delay: number) => {
        const A = nodesRef.current.get(a), B = nodesRef.current.get(b)
        if (!A || !B) return
        const c = g.append('circle').attr('r', 3).attr('fill', 'var(--ink-50)').attr('cx', A.x!).attr('cy', A.y!).attr('opacity', 0)
        c.transition().delay(delay).duration(700).ease(d3.easeCubicInOut).attr('opacity', 1)
          .attrTween('cx', () => (t) => String(A.x! + (B.x! - A.x!) * t)).attrTween('cy', () => (t) => String(A.y! + (B.y! - A.y!) * t))
          .transition().duration(200).attr('opacity', 0).attr('r', 8).remove()
        g.append('circle').attr('r', 4).attr('fill', 'none').attr('stroke', 'var(--ink-50)').attr('cx', B.x!).attr('cy', B.y!).attr('opacity', 0)
          .transition().delay(delay + 700).duration(600).attr('r', 22).attr('opacity', 0.5).transition().duration(300).attr('opacity', 0).remove()
      }
      const payer = nodeId(pay.chain, 'payer', pay.payer), fac = nodeId(pay.chain, 'facilitator', pay.facilitator), to = nodeId(pay.chain, 'payTo', pay.payTo)
      hop(payer, fac, i * 250); hop(fac, to, i * 250 + 700)
    })
  }, [payments])

  // Routes unmount this component, so the simulation timer and any running transitions
  // must be torn down or they keep ticking against detached nodes.
  useEffect(() => () => {
    sim.current?.on('tick', null)
    sim.current?.stop()
    sim.current = null
    const svg = ref.current
    if (svg) d3.select(svg).selectAll('*').interrupt()
  }, [])

  return (
    <div className="relative">
      <svg ref={ref}
        style={{ touchAction: touchMap ? 'none' : 'pan-y' }}
        className={`map-fade h-[300px] w-full cursor-grab active:cursor-grabbing sm:h-[440px] lg:h-[520px] ${touchMap ? 'ring-2 ring-ink-300 ring-inset' : ''}`}>
        <g className="scene">
          <g className="links" />
          <g className="nodes" />
          <g className="fx" />
        </g>
      </svg>
      <Controls onIn={() => nudgeZoom(1.45)} onOut={() => nudgeZoom(1 / 1.45)} onReset={resetView}
        touchMap={touchMap} onToggleTouch={() => setTouchMap((v) => !v)} />
    </div>
  )
}

function Controls({ onIn, onOut, onReset, touchMap, onToggleTouch }: {
  onIn: () => void; onOut: () => void; onReset: () => void; touchMap: boolean; onToggleTouch: () => void
}) {
  const { t } = useT()
  const cls = 'grid h-7 w-7 place-items-center rounded-md border border-ink-800 bg-ink-950/80 text-ink-300 backdrop-blur transition hover:border-ink-600 hover:text-ink-100 focus-visible:border-ink-500 focus-visible:outline-none'
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
      {/* Touch only: claims the gesture for the map, releasing the page scroll. */}
      <button type="button" onClick={onToggleTouch} aria-pressed={touchMap}
        aria-label={t(touchMap ? 'zoom.touchOff' : 'zoom.touchOn')}
        title={t(touchMap ? 'zoom.touchOff' : 'zoom.touchOn')}
        className={`grid h-7 w-7 place-items-center rounded-md border backdrop-blur transition focus-visible:outline-none sm:hidden ${
          touchMap
            ? 'border-ink-100 bg-ink-100 text-ink-950'
            : 'border-ink-800 bg-ink-950/80 text-ink-300 hover:border-ink-600 hover:text-ink-100'
        }`}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M8 2v6M5.4 3.6v4.4M10.6 3.6v4.4M3 6.4v3.1a4.5 4.5 0 0 0 4.5 4.5h.6a4.4 4.4 0 0 0 4.4-4.4V5.6"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" onClick={onIn} aria-label={t('zoom.in')} title={t('zoom.in')} className={cls}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" onClick={onOut} aria-label={t('zoom.out')} title={t('zoom.out')} className={cls}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" onClick={onReset} aria-label={t('zoom.reset')} title={t('zoom.reset')} className={cls}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="1.6" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}

// Facilitator discs were large enough to crowd the canvas and hide the edges behind them.
const r = (d: Node) =>
  d.kind === 'facilitator' ? 4.5 + Math.min(7, Math.sqrt(d.weight) * 1.2)
    : d.kind === 'payTo' ? 2.5 + Math.min(4, d.weight * 0.7)
      : 2
