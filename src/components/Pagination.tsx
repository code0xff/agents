import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../i18n'

export interface Paged<T> {
  page: number
  totalPages: number
  items: T[]
  from: number
  to: number
  total: number
  setPage: (p: number) => void
  next: () => void
  prev: () => void
}

/** Index-based pagination over a live-updating list. Page is clamped when the list shrinks. */
export function usePagination<T>(all: T[], pageSize: number): Paged<T> {
  const [page, setPageRaw] = useState(1)
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => { if (page > totalPages) setPageRaw(totalPages) }, [page, totalPages])
  const current = Math.min(page, totalPages)
  const setPage = useCallback((p: number) => setPageRaw(Math.min(Math.max(1, p), totalPages)), [totalPages])
  const items = useMemo(() => all.slice((current - 1) * pageSize, current * pageSize), [all, current, pageSize])
  return {
    page: current, totalPages, items, total,
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
    setPage,
    next: () => setPage(current + 1),
    prev: () => setPage(current - 1),
  }
}

export function Pagination<T>({ paged, compact = false }: { paged: Paged<T>; compact?: boolean }) {
  const { t } = useT()
  const { page, totalPages, from, to, total, setPage, next, prev } = paged
  if (total === 0) return null
  const btn = 'rounded border border-ink-800 px-2 py-1 font-mono text-[10px] text-ink-400 transition enabled:hover:border-ink-600 enabled:hover:text-ink-100 disabled:opacity-30'
  return (
    <nav className="flex items-center justify-between gap-2 border-t border-ink-800 px-4 py-2" aria-label="Pagination">
      <span className="font-mono text-[10px] text-ink-500 tabular-nums">
        {t('page.range', { from, to, total })}
      </span>
      <div className="flex items-center gap-1">
        {!compact && (
          <button className={btn} onClick={() => setPage(1)} disabled={page === 1} aria-label={t('page.first')}>«</button>
        )}
        <button className={btn} onClick={prev} disabled={page === 1} aria-label={t('page.prev')}>‹</button>
        <span className="px-1 font-mono text-[10px] text-ink-300 tabular-nums">{page}/{totalPages}</span>
        <button className={btn} onClick={next} disabled={page === totalPages} aria-label={t('page.next')}>›</button>
        {!compact && (
          <button className={btn} onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label={t('page.last')}>»</button>
        )}
      </div>
    </nav>
  )
}
