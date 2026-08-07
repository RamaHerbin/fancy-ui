# PixelLoader

A small square grid of pixels whose opacity pulses in a diagonal scanning wave — the loading state to show while a model is working and has no token to display yet.

## Usage

```svelte
<script>
	import { PixelLoader } from "fancy-ui-svelte";
</script>

<PixelLoader />

<PixelLoader cols={8} rows={8} cellSize={8} gap={3} color="#22d3ee" speed={2.2} label="Working" />
```

## Props

| Prop       | Type                                | Default                               | Description                                  |
| ---------- | ----------------------------------- | ------------------------------------- | -------------------------------------------- |
| `cols`     | `number`                            | `5`                                   | Number of pixel columns                      |
| `rows`     | `number`                            | `5`                                   | Number of pixel rows                         |
| `cellSize` | `number`                            | `6`                                   | Size of a single pixel in px                 |
| `gap`      | `number`                            | `2`                                   | Space between pixels in px                   |
| `color`    | `string`                            | `var(--ft-pixel-color, currentColor)` | Pixel colour, any CSS colour value           |
| `speed`    | `number`                            | `1.6`                                 | Duration of one full pulse cycle in seconds  |
| `label`    | `string`                            | `'Loading'`                           | Accessible label announced by assistive tech |
| `class`    | `string`                            | `undefined`                           | Additional CSS classes                       |
| `ref`      | `HTMLDivElement \| null` (bindable) | `null`                                | Bound reference to the root element          |

## Theming

The default `color` resolves `--ft-pixel-color` from any ancestor and falls back to `currentColor`, so the grid inherits the surrounding text colour unless a theme sets the token:

```css
.my-panel {
	--ft-pixel-color: oklch(0.72 0.15 250);
}
```

## Implementation Notes

- **Deterministic delays.** Each pixel's `animation-delay` comes from its coordinates — `((row + col) % (rows + cols)) * (speed / (rows + cols))` — which walks the anti-diagonals and reads as a wave crossing the grid. No `Math.random`, so server and client render identical markup and hydration never mismatches.
- **No JavaScript animation.** The pulse is a single `@keyframes` rule (opacity `0.15 → 1 → 0.15`) shared by every pixel; only the delay differs. Nothing runs on the main thread once the grid is mounted.
- **SSR-safe.** No browser API is touched at any point — the component is pure markup plus CSS, so it renders on the server as-is.
- **Reduced motion.** The animation lives entirely inside `@media (prefers-reduced-motion: no-preference)`. When motion is reduced there is no animation to override: every pixel simply holds the mid-pulse opacity and the grid still reads as a loader.
- **Live region.** The root is `role="status"` with `aria-live="polite"` and carries the label as visually hidden text. `role="status"` takes no accessible name from its content, so the label is what assistive tech announces rather than a name on the region.
