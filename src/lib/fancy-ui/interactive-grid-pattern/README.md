# InteractiveGridPattern

SVG grid of squares that highlight on hover with smooth fade transitions.

## Usage

```svelte
<script lang="ts">
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern";
</script>

<div class="relative h-96 w-full overflow-hidden">
	<InteractiveGridPattern />
</div>
```

## Props

| Prop               | Type               | Default                | Description                                                                                  |
| ------------------ | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------- |
| `class`            | `string`           | -                      | Classes on the SVG container                                                                 |
| `squaresClassName` | `string`           | -                      | Classes on individual rect elements                                                          |
| `strokeClassName`  | `string`           | `'stroke-gray-400/30'` | Classes controlling the square outline color                                                 |
| `width`            | `number`           | `40`                   | Square width in pixels                                                                       |
| `height`           | `number`           | `40`                   | Square height in pixels                                                                      |
| `squares`          | `[number, number]` | `[24, 24]`             | Grid dimensions `[columns, rows]`                                                            |
| `interactive`      | `boolean`          | `true`                 | When `false`, renders a static graph-paper grid: no per-rect mouse listeners, no hover state |

## Static graph-paper mode

Set `interactive={false}` for a plain grid backdrop with zero per-rect event listeners — useful for a print/graph-paper look behind static content, or when the hover cost of hundreds of rects isn't wanted. Combine with `strokeClassName` to recolor the lines without overriding `squaresClassName` (which also carries the fill logic):

```svelte
<InteractiveGridPattern interactive={false} strokeClassName="stroke-black/40" />
```

## Implementation Notes

- Uses `$state` for hover tracking, Svelte 5 `onmouseenter`/`onmouseleave` handlers
- CSS transition: 100ms on hover-in, 1000ms on hover-out via `:not(:hover)` selector
- When `interactive` is `false`, the `onmouseenter`/`onmouseleave` handlers are `undefined` rather than no-ops, so no listeners are attached to the DOM at all
