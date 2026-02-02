# InteractiveGridPattern

SVG grid of squares that highlight on hover with smooth fade transitions.

## Usage

```svelte
<script lang="ts">
  import { InteractiveGridPattern } from '$lib/fancy-ui/interactive-grid-pattern';
</script>

<div class="relative h-96 w-full overflow-hidden">
  <InteractiveGridPattern />
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | - | Classes on the SVG container |
| `squaresClassName` | `string` | - | Classes on individual rect elements |
| `width` | `number` | `40` | Square width in pixels |
| `height` | `number` | `40` | Square height in pixels |
| `squares` | `[number, number]` | `[24, 24]` | Grid dimensions `[columns, rows]` |

## Porting Notes

- Vue source: `vendor/inspira/ui/interactive-grid-pattern/InteractiveGridPattern.vue`
- Uses `$state` for hover tracking, Svelte 5 `onmouseenter`/`onmouseleave` handlers
- CSS transition: 100ms on hover-in, 1000ms on hover-out via `:not(:hover)` selector
