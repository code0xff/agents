# Design system

## Tone
Monotone, refined, futuristic. Dark by default. No color accents — hierarchy comes from luminance,
weight, and motion.

## Theming
Light/dark toggle (`src/lib/theme.ts`, `components/ThemeToggle.tsx`). Switches the `html.dark` /
`html.light` class, persists to `localStorage("aeo-theme")`, defaults to the system preference. An
inline script in `index.html` applies the class before first paint to avoid a flash.

## Color tokens (`src/index.css`)
`--ink-*` CSS variables are defined on `:root` (dark) and `.light`, and exposed to Tailwind through
`@theme inline` as `ink-*` utilities. Meaning is always **luminance order**: `ink-950` (background) …
`ink-50` (strongest text). Values flip in light mode, so components never use hex — tokens only.
In D3/SVG, put the `var(--ink-N)` string directly into attributes (never interpolate colors inside a
transition). Helper variables: `--grid-line`, `--flash`, `--panel`.

Usage: background `ink-950`, panel `bg-panel + backdrop-blur`, borders `ink-800`, body text `ink-100`,
secondary text `ink-400`, disabled `ink-500`. Status (success/failure) is expressed with icons,
luminance, and motion — not color.

## Typography
Inter (body), JetBrains Mono (numbers, addresses, logs). Labels are mono, wide tracking, uppercase.
CJK locales fall back to the system sans stack; keep line-height generous.

## Background
`.bg-grid` subtle grid. Slow parallax via motion `useScroll`.

## Motion principles
- Entry: motion `initial/animate`, short stagger (0.1–0.15s)
- Scroll: Lenis smooth scrolling
- Live events (log / payments): new rows slide in from the top with a brief background flash
- Graph: D3 transitions; node pulses use luminance only
- Numbers: count-up (motion `animate`)
- Never write large amounts of custom keyframes. Libraries first.

## Component rules
- `rounded-lg`/`rounded-xl`, 1px borders, no shadows (blurred panel background instead of glow)
- Dense data uses mono font at small sizes (`text-xs`)
