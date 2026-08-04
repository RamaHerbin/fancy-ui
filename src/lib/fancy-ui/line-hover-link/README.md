# LineHoverLink

An anchor with a pure-CSS underline hover effect, selectable from 11 variants. No JavaScript runs on hover — every variant is `::before`/`::after` pseudo-elements or an inline SVG stroke animated with CSS `transition`/`transform`/`stroke-dashoffset`, triggered by `:hover`/`:focus-visible`.

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

`LineHoverVariant` is one of: `"slide" | "double" | "grow" | "strike" | "fade" | "pulse" | "swap" | "sweep" | "bounce" | "arc" | "scribble"`.

## Implementation notes

- The component has no `<script>`-side reactive state beyond two `$derived` values — everything visual is CSS selected by a `link-hover--<variant>` class.
- `arc` and `scribble` render an inline `<svg>` with a single `<path pathLength="1">` instead of a pseudo-element underline; both use the same technique (`stroke-dasharray: 1; stroke-dashoffset: 1` at rest, animated to `0` on hover/focus via `transition: stroke-dashoffset`).
- `strike`, `bounce`, `arc`, and `scribble` wrap the link text in an inner `<span>` (via the `needsSpan` derived flag) because those variants also transform the text itself (scale for `strike`, translate for `bounce`) independently of the underline graphic.
- `rel` defaults to `"noopener noreferrer"` automatically when `target="_blank"` and no explicit `rel` was passed, via the `relValue` derived value — an explicit `rel` prop is never overridden.
- All variants respond to both `:hover` and `:focus-visible`, so the effect is keyboard-navigable, not mouse-only.
