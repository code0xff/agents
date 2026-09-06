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
One family for the whole interface: JetBrains Mono. A proportional face was used for panel titles,
card names and descriptions, and inside otherwise monospaced panels those few elements read as a
different product. Hierarchy comes from size, weight and luminance rather than a second family.

Prose set in a monospaced face needs more room per line, so descriptions run at 11-12px with 1.7
leading rather than the usual 12-13px. Labels stay mono, uppercase, wide tracking.

CJK has no glyphs in JetBrains Mono and falls back to the system stack, so Korean, Japanese and
Chinese render proportionally. That is expected and was already true of every label.

## Contrast
Measured against the panel ground, not eyeballed. The scale is not symmetric between themes, so dark
is the binding case.

| Token | Dark | Light |
|---|---|---|
| `ink-300` | 7.4:1 | 9.5:1 |
| `ink-400` | 4.9:1 | 6.3:1 |
| `ink-500` | 3.1:1 | 3.4:1 |
| `ink-600` | 1.4:1 | 2.0:1 |

`ink-400` is the floor for anything meant to be read, including 9px captions, which get no large-text
exemption. `ink-500` is for text a reader may skip, such as a relative timestamp in a dense row.
`ink-600` and below are borders and decoration; they are not a text colour. Dark `ink-500` and
`ink-400` were lightened to reach these figures after a source caption shipped at 1.4:1, which is
invisible.

## Background
`.bg-grid` subtle grid. Slow parallax via motion `useScroll`.

## Motion principles
Motion is for arrival and change, never for whether something is legible. See "Motion and
correctness" below for the rule that follows from that.

- Entry: motion `initial/animate`, short stagger (0.1–0.15s)
- Scroll: Lenis smooth scrolling
- Live events (log / payments): new rows slide in from the top with a brief background flash
- Graph: D3 transitions; node pulses use luminance only
- Numbers: count-up (motion `animate`)
- Never write large amounts of custom keyframes. Libraries first.

## Layout and hierarchy
The app is split into four routes rather than one long scroll: overview, payments, registry,
marketplaces. A sticky header carries the mark, the route tabs, and on the right the locale select,
the theme toggle and a link to the repository, in that order: the two controls a reader changes come
before the link that leaves. Installation is left to the browser, so no install button is shown.

Each route opens with a `PageHead`: status line, route title, one line of lead copy. The title uses
the mono family like everything else; a proportional display face read as a separate product sitting
on top of the dashboard.

Overview is the interpretation layer. The point of the top half is interpretation, not raw totals:
each `Signal` pairs a headline number with a trend and the shape of its series, and `Concentration`
answers where the activity sits, across three shares: which facilitator settles most payments, which
chains those payments run on, and which chains hold the agents. Raw feeds live on their own routes.

Not every number compares the same span, so each tile states which comparison it shows. Counts have a
daily series and compare seven days against the prior seven; volume exists only monthly and compares
the last two complete months. A trend that does not say what it measured invites the reader to assume
the wrong one.

## Naming
A label names what is being counted, not how it was obtained. "Observed live" sat beside "x402
payments, all time" and never said what it was a rate of; as "x402 payments, live" the two read as
one subject seen two ways, one from a twelve-month aggregate and one from what the page can see now.
Method belongs in the sub-line or the source note.

## Provenance
A reader cannot judge a number without knowing where it came from and how old it is, so the interface
says so next to the number rather than in a footnote. The signal row names its source and age. A chart
whose feed refreshes on a slower schedule than the totals beside it carries its own date; the chain
split currently reads eighteen days behind the figures above it, and nothing on the page admitted that
until it was labelled. Marketplace cards carry a live / snapshot / aggregate / link badge.

## Selection
Where two datasets do not interact, they are selected between rather than merged. Base and Polygon
never settle with each other, so one chain shows at a time: a single graph of both suggested one flow
where there are two networks, and a merged list ordered by time let the busier chain crowd the other
out of view. The chain filters are radio groups, and the row-level chain badge goes away because the
selection already states it.

## Controls
Language is a native `select`: compact at any width, accessible for free, and it opens as the
platform picker on touch. Theme is a single icon button that swaps a sun and moon glyph. The
repository link is an icon of the same size, last in the row.

Below `md` the route tabs and all three collapse behind a menu button on the right. The panel is
absolutely positioned under the header bar so it overlays the page; laid out in flow it grew the
sticky header and pushed the content down. Its background is opaque rather than translucent, or the
page shows through the menu items. It closes on navigation, on Escape, and on a tap outside. Its open
state is stored as the route it was opened on, so a route change closes it during render rather than
through an effect.

## Bounds
A view onto something larger should not advertise its frame. The flow map bounds its layout to an
ellipse and fades its own edges, so the panel border is the only straight line and the graph reads as
a window rather than a diagram drawn to fit a box.

## Toggle state
A control that holds a mode inverts: filled background, background-coloured glyph. Shifting a border
or text one step brighter is invisible when every step is a shade of grey.

## Motion and correctness
Geometry and visibility are set directly, never only through a transition. A transition that never
runs leaves the element at its initial value, so animating in from `opacity: 0` or `r: 0` can render
a blank panel. Animate changes, but make the resting state correct without them.

## Overlays
Dialogs render into `document.body` through a portal. A `backdrop-filter` makes an element the
containing block for its fixed-position descendants, so an overlay rendered inside a blurred panel is
sized to that panel rather than the viewport, and clipped by its overflow. On a phone this put the
card halfway down the screen.

## Cursors
Tailwind v4's preflight leaves buttons at the browser default cursor. `src/index.css` restores
`pointer` for buttons, links, selects and anything with a button role, and marks disabled controls
`not-allowed`.

## Component rules
A label that repeats across every row is background, not information. Both "Unnamed" and an operator
name shared by twenty addresses were removed for this reason: the address distinguishes, the repeated
word does not. Detail that only some readers want goes to hover.

Headline facts that sit side by side get their own outline. Run together as plain text they read as
one sentence and the reader cannot tell where each fact ends; the `Fact` chip in `Concentration`
pairs a muted uppercase label with an emphasised value inside a bordered box.

- `rounded-lg`/`rounded-xl`, 1px borders, no shadows (blurred panel background instead of glow)
- Dense data uses mono font at small sizes (`text-xs`)
- A long list is paginated rather than given its own scroll area, so a page has one scroll axis.
  Mechanics and page sizes are in `docs/pwa.md`.
