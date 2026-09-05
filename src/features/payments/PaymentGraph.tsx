import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Translate } from '../../i18n'
import { short } from '../../lib/format'
import { facilitatorLabel, type Payment } from './usePayments'

type Kind = 'facilitator' | 'payer' | 'payTo'
/** Keyed by role as well as address: the same address can act in several roles at once,
 *  and a single shared node would flip its colour, size and label between them. */
interface Node extends d3.SimulationNodeDatum { id: string; addr: string; kind: Kind; label: string; weight: number }
const nodeId = (kind: Kind, addr: string) => `${kind}:${addr}`
interface Link extends d3.SimulationLinkDatum<Node> { id: string; source: string | Node; target: string | Node; weight: number }

// Recent payments kept in the graph. A small phone canvas cannot hold the desktop
// window legibly, so it keeps fewer.
const WINDOW_DESKTOP = 120
const WINDOW_MOBILE = 40

export function PaymentGraph({ payments, counts, t, compact = false }: { payments: Payment[]; counts: Record<string, number>; t: Translate; compact?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sim = useRef<d3.Simulation<Node, Link> | null>(null)
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const linksRef = useRef<Map<string, Link>>(new Map())
  const lastKey = useRef<string | null>(null)

  const recent = useMemo(() => payments.slice(0, compact ? WINDOW_MOBILE : WINDOW_DESKTOP), [payments, compact])

  // Keep the layout centered when the viewport or panel width changes.
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

  // Sync nodes/edges with the recent payments window
  useEffect(() => {
    const svg = d3.select(ref.current!)
    const { width, height } = ref.current!.getBoundingClientRect()
    const nodes = nodesRef.current, links = linksRef.current
    const keep = new Set<string>(), keepL = new Set<string>()
    const up = (kind: Kind, addr: string, label: string) => {
      const id = nodeId(kind, addr)
      let n = nodes.get(id)
      if (!n) { n = { id, addr, kind, label, weight: 0, x: width / 2 + (Math.random() - 0.5) * 80, y: height / 2 + (Math.random() - 0.5) * 80 }; nodes.set(id, n) }
      n.label = label; keep.add(id); return n
    }
    const upL = (a: string, b: string) => { const id = `${a}>${b}`; if (!links.has(id)) links.set(id, { id, source: a, target: b, weight: 0 }); keepL.add(id) }
    // d3-force requires stable, mutable node objects across ticks, so the maps below are
    // updated in place rather than rebuilt. `recent` itself is only ever read.
    for (const p of recent) {
      const fl = facilitatorLabel(p, counts, t) ?? short(p.facilitator)
      up('facilitator', p.facilitator, fl); up('payer', p.payer, short(p.payer)); up('payTo', p.payTo, short(p.payTo))
      upL(nodeId('payer', p.payer), nodeId('facilitator', p.facilitator))
      upL(nodeId('facilitator', p.facilitator), nodeId('payTo', p.payTo))
    }
    for (const id of nodes.keys()) if (!keep.has(id)) nodes.delete(id)
    for (const id of links.keys()) if (!keepL.has(id)) links.delete(id)
    // Weights describe the current window only, so both maps reset before re-counting.
    for (const n of nodes.values()) n.weight = 0
    for (const l of links.values()) l.weight = 0
    for (const p of recent) {
      nodes.get(nodeId('facilitator', p.facilitator))!.weight += 3
      nodes.get(nodeId('payer', p.payer))!.weight += 1
      nodes.get(nodeId('payTo', p.payTo))!.weight += 1
      links.get(`${nodeId('payer', p.payer)}>${nodeId('facilitator', p.facilitator)}`)!.weight += 1
      links.get(`${nodeId('facilitator', p.facilitator)}>${nodeId('payTo', p.payTo)}`)!.weight += 1
    }
    for (const n of nodes.values()) if (n.kind === 'facilitator') { n.fx = undefined; n.fy = undefined }

    const N = [...nodes.values()], L = [...links.values()]
    if (!sim.current) {
      sim.current = d3.forceSimulation<Node, Link>()
        .force('charge', d3.forceManyBody<Node>().strength((d) => d.kind === 'facilitator' ? -500 : -160).distanceMax(400))
        .force('x', d3.forceX(width / 2).strength(0.04))
        .force('y', d3.forceY(height / 2).strength(0.06))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide<Node>().radius((d) => r(d) + 4))
        .alphaDecay(0.02)
        .velocityDecay(0.35)
    }
    const s = sim.current
    s.nodes(N)
    s.force('link', d3.forceLink<Node, Link>(L).id((d) => d.id).distance((l) => ((l.source as Node).kind === 'facilitator' || (l.target as Node).kind === 'facilitator') ? 120 : 70).strength(0.2))
    s.force('center', d3.forceCenter(width / 2, height / 2))
    s.alpha(0.6).restart()

    const g = svg.select<SVGGElement>('g.root')
    // Geometry and visibility are set directly rather than through a transition: a transition
    // that never runs (throttled tab, reduced motion) would leave the graph blank.
    const link = g.select('g.links').selectAll<SVGLineElement, Link>('line').data(L, (d) => d.id)
    link.exit().remove()
    const linkE = link.enter().append('line').attr('stroke', 'var(--ink-200)').attr('opacity', 0.18)
    const linkAll = linkE.merge(link).attr('stroke-width', (d) => Math.min(3, 0.6 + d.weight * 0.3))

    const node = g.select('g.nodes').selectAll<SVGGElement, Node>('g.n').data(N, (d) => d.id)
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
    nodeAll.select('text').text((d) =>
      d.kind === 'facilitator' ? (d.weight >= minFacWeight ? d.label : '')
        : d.kind === 'payTo' && !compact && d.weight >= 3 ? d.label : '')
      .attr('fill', (d) => d.kind === 'facilitator' ? 'var(--ink-50)' : 'var(--ink-300)')
    nodeAll.call(d3.drag<SVGGElement, Node>()
      .on('start', (ev, d) => { if (!ev.active) s.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y })
      .on('end', (ev, d) => { if (!ev.active) s.alphaTarget(0); d.fx = null; d.fy = null }))
    nodeAll.select('title').remove()
    nodeAll.append('title').text((d) => `${d.kind} ${d.addr}`)

    // Keep every node inside the canvas. Labels are centred on the node and sit above it,
    // so a labelled node needs half its label width horizontally and extra room on top.
    const labelled = new Set<string>()
    nodeAll.select<SVGTextElement>('text').each(function (d) { if (this.textContent) labelled.add(d.id) })
    const clamp = (d: Node) => {
      const rad = r(d)
      const half = labelled.has(d.id) ? Math.max(rad, (d.label.length * 5.4) / 2) : rad
      const padX = Math.min(half + 4, width / 2)
      d.x = Math.max(padX, Math.min(width - padX, d.x ?? width / 2))
      d.y = Math.max(rad + 16, Math.min(height - rad - 4, d.y ?? height / 2))
    }
    s.on('tick', () => {
      for (const n of N) clamp(n)
      linkAll.attr('x1', (d) => (d.source as Node).x!).attr('y1', (d) => (d.source as Node).y!).attr('x2', (d) => (d.target as Node).x!).attr('y2', (d) => (d.target as Node).y!)
      nodeAll.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })
  }, [recent, counts, t, size, compact])

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
      const payer = nodeId('payer', pay.payer), fac = nodeId('facilitator', pay.facilitator), to = nodeId('payTo', pay.payTo)
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
    <svg ref={ref} className="h-[280px] w-full touch-pan-y sm:h-[380px] lg:h-[420px]">
      <g className="root"><g className="links" /><g className="nodes" /></g>
      <g className="fx" />
    </svg>
  )
}

// Facilitator discs were large enough to crowd the canvas and hide the edges behind them.
const r = (d: Node) =>
  d.kind === 'facilitator' ? 4.5 + Math.min(7, Math.sqrt(d.weight) * 1.2)
    : d.kind === 'payTo' ? 2.5 + Math.min(4, d.weight * 0.7)
      : 2
