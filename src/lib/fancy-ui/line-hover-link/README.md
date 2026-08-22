# LineHoverLink

An anchor with a pure-CSS underline hover effect, selectable from 12 variants. No JavaScript runs on hover — every variant is `::before`/`::after` pseudo-elements or an inline SVG stroke animated with CSS `transition`/`transform`/`stroke-dashoffset`, triggered by `:hover`/`:focus-visible`.

## Usage

```svelte
<script lang="ts">
	import { LineHoverLink } from "fancy-ui-svelte";
</script>

<LineHoverLink href="/about" variant="slide">About</LineHoverLink>
<LineHoverLink href="/contact" variant="scribble" target="_blank">Contact</LineHoverLink>
```

## Props

| Prop         | Type               | Default   | Description            |
| ------------ | ------------------ | --------- | ---------------------- |
| `variant`    | `LineHoverVariant` | `"slide"` | The animation variant  |
| `href`       | `string`           | `"#"`     | Link href              |
| `target`     | `string`           | —         | Link target            |
| `rel`        | `string`           | —         | Link rel               |
| `aria-label` | `string`           | —         | Accessible label       |
| `class`      | `string`           | `""`      | Additional CSS classes |

Children (slot content) are the link's visible text/label.

`LineHoverVariant` is one of: `"slide" | "double" | "grow" | "strike" | "fade" | "pulse" | "swap" | "sweep" | "bounce" | "arc" | "scribble" | "ink"`.

## Motion

- Each variant has its own choreography — eleven bespoke `cubic-bezier`
  curves across durations of `0.2s`, `0.3s`, `0.4s` and `0.6s`. These are
  deliberately **not** retokenised onto the library's four house curves:
  flattening them would make twelve distinct variants read as one.
- **Reduced motion.** Every `transition` and `animation` declaration in the
  component lives inside `@media (prefers-reduced-motion: no-preference)`,
  and nothing else does. The resting and hover states themselves stay
  outside it, so a visitor who asked for less motion still gets the full
  underline, cover or stroke — it appears instead of travelling. Nothing goes
  invisible: `pulse` and `sweep` reach their visible state through their
  keyframes' `forwards` fill, so their `opacity: 1` is declared outside the
  guard on purpose, and `arc`/`scribble` snap from `stroke-dashoffset: 1` to
  `0` rather than drawing.
- Each variant keeps its own guard block next to its own rules rather than
  pooling them at the end of the file, so the shape is obvious to whoever
  adds variant thirteen.
- **Touch and coarse pointers.** Every variant answers to both `:hover` and
  `:focus-visible`, so the effect is keyboard-reachable. `ink` is the one
  variant whose translate could stick on a synthesised hover, and its hover
  half is gated behind `@media (hover: hover)` for exactly that reason.

## Implementation notes

- The component has no `<script>`-side reactive state beyond two `$derived` values — everything visual is CSS selected by a `link-hover--<variant>` class.
- `arc` and `scribble` render an inline `<svg>` with a single `<path pathLength="1">` instead of a pseudo-element underline; both use the same technique (`stroke-dasharray: 1; stroke-dashoffset: 1` at rest, animated to `0` on hover/focus via `transition: stroke-dashoffset`).
- `strike`, `bounce`, `arc`, and `scribble` wrap the link text in an inner `<span>` (via the `needsSpan` derived flag) because those variants also transform the text itself (scale for `strike`, translate for `bounce`) independently of the underline graphic.
- `ink` is the odd one out: the underline is a constant 2px `::before` — not animated in — and instead the whole link snaps `translate3d(-1px, -1px, 0)` on interaction, for a hard-edge, ink-stamp feel. The hover half of the rule is gated behind `@media (hover: hover)` so touch devices don't get a stuck translated state; `:focus-visible` still applies unconditionally for keyboard users.
- `rel` defaults to `"noopener noreferrer"` automatically when `target="_blank"` and no explicit `rel` was passed, via the `relValue` derived value — an explicit `rel` prop is never overridden.
- All variants respond to both `:hover` and `:focus-visible`, so the effect is keyboard-navigable, not mouse-only.
