# GlowBorder

An animated glowing border effect using CSS masks and gradients.

## Usage

```svelte
<script>
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<div class="bg-card relative rounded-xl p-6">
	<p>Content goes here</p>
	<GlowBorder color="#00ffff" />
</div>
```

## Props

| Prop           | Type                 | Default  | Description                                  |
| -------------- | -------------------- | -------- | -------------------------------------------- |
| `class`        | `string`             | `''`     | Additional CSS classes                       |
| `color`        | `string \| string[]` | `'#FFF'` | Glow color(s) - single or array for gradient |
| `borderRadius` | `number`             | `10`     | Border radius in pixels                      |
| `borderWidth`  | `number`             | `2`      | Border thickness in pixels                   |
| `duration`     | `number`             | `10`     | Animation duration in seconds                |

## Examples

### Single Color

```svelte
<GlowBorder color="#00ffff" />
```

### Multi-Color Gradient

```svelte
<GlowBorder color={["#3b82f6", "#8b5cf6", "#ec4899"]} />
```

### Custom Thickness

```svelte
<GlowBorder borderWidth={4} color="#ff00ff" />
```

## Requirements

- Parent element must have `position: relative`
- Works best on dark backgrounds

## Implementation Notes

- Animation defined in component's scoped styles
- Respects `prefers-reduced-motion` for accessibility
- Uses CSS mask-composite for the border effect
