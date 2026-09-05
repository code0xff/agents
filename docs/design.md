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

## Layout and hierarchy
The app is split into four routes rather than one long scroll: overview, payments, registry,
marketplaces. A sticky header carries the mark, the route tabs, and the locale and theme controls on
the right. Installation is left to the browser, so no install button is shown.

Each route opens with a `PageHead`: status line, route title, one line of lead copy. The title uses
the mono family like everything else; a proportional display face read as a separate product sitting
on top of the dashboard.

Overview is the interpretation layer.
The point of the top half is interpretation, not raw totals: each `Signal` pairs a headline number
with its 7-day momentum and the shape of the series, and the `Concentration` panel answers where the
activity actually sits (which facilitator settles most payments, which chain holds most agents).
Raw feeds live on their own routes.

## Controls
Language is a native `select`: compact at any width, accessible for free, and it opens as the
platform picker on touch. Theme is a single icon button that swaps a sun and moon glyph.

Below `md` the route tabs and both controls collapse behind a menu button on the right. The panel is
absolutely positioned under the header bar so it overlays the page; laid out in flow it grew the
sticky header and pushed the content down. Its background is opaque rather than translucent, or the
page shows through the menu items. It closes on navigation, on Escape, and on a tap outside. Its open
state is stored as the route it was opened on, so a route change closes it during render rather than
through an effect.

## Bounds
A view onto something larger should not advertise its frame. The flow map bounds its layout to an
ellipse and fades its own edges, so the panel border is the only straight line and the graph reads as
a window rather than a diagram drawn to fit a box.

## Motion and correctness
Geometry and visibility are set directly, never only through a transition. A transition that never
runs leaves the element at its initial value, so animating in from `opacity: 0` or `r: 0` can render
a blank panel. Animate changes, but make the resting state correct without them.

## Component rules
Headline facts that sit side by side get their own outline. Run together as plain text they read as
one sentence and the reader cannot tell where each fact ends; the `Fact` chip in `Concentration`
pairs a muted uppercase label with an emphasised value inside a bordered box.

- `rounded-lg`/`rounded-xl`, 1px borders, no shadows (blurred panel background instead of glow)
- Dense data uses mono font at small sizes (`text-xs`)
