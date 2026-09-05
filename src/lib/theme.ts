import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'aeo-theme'

function initial(): Theme {
  try { const s = localStorage.getItem(KEY); if (s === 'dark' || s === 'light') return s } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(t: Theme) {
  const el = document.documentElement
  el.classList.toggle('light', t === 'light')
  el.classList.toggle('dark', t === 'dark')
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)
  useEffect(() => { applyTheme(theme); try { localStorage.setItem(KEY, theme) } catch { /* ignore */ } }, [theme])
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}

/** D3 등 CSS 밖에서 토큰 색을 읽을 때 */
export const ink = (n: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950) => `var(--ink-${n})`
