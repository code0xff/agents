/**
 * Shared control classes, after the 1gateway site (`src/landing/site.ts`, `list.ts`):
 * 28px controls, 8px radius, no border at rest for icon and nav items, a soft fill on hover.
 */
const ease = 'transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]'

/** Borderless square icon button. */
export const iconBtn = `inline-grid size-7 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-ink-400 ${ease} hover:bg-ink-800 hover:text-ink-100 focus-visible:outline-1 focus-visible:outline-ink-100`

/** Top navigation item. */
export const navItem = (active: boolean) =>
  `inline-flex h-7 shrink-0 items-center rounded-lg px-3 text-[13px] ${ease} hover:bg-ink-800 hover:text-ink-100 ${active ? 'font-medium text-ink-100' : 'text-ink-400'}`

/** Filter chip; the held state draws a full-contrast border and text. */
export const chip = (on: boolean) =>
  `inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] ${ease} hover:bg-ink-800 hover:text-ink-100 ${on ? 'border-ink-100 text-ink-100' : 'border-ink-800 text-ink-400'}`

/** Pager button. */
export const pageBtn = `inline-grid h-7 min-w-7 place-items-center rounded-lg border border-transparent bg-transparent px-1.5 font-mono text-[12px] text-ink-400 ${ease} enabled:hover:bg-ink-800 enabled:hover:text-ink-100 disabled:opacity-40`

/** Primary (filled) button. */
export const primaryBtn = `inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-ink-100 bg-ink-100 px-2.5 text-[13px] font-medium text-ink-950 transition-opacity duration-[120ms] hover:opacity-85`
