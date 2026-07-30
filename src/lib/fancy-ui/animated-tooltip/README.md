# AnimatedTooltip

A row of overlapping avatars that pop a name/role tooltip above the hovered item. The tooltip tilts and shifts horizontally based on where the cursor is over the avatar, giving it a light spring-like feel without a physics library.

## Usage

```svelte
<script lang="ts">
	import { AnimatedTooltip } from "fancy-ui-svelte";
	import type { TooltipItem } from "fancy-ui-svelte";

	const people: TooltipItem[] = [
		{
			id: 1,
			name: "John Doe",
			designation: "Software Engineer",
			image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
		},
	];
</script>

<AnimatedTooltip items={people} />
```

## Props

| Prop    | Type            | Default | Description                             |
| ------- | --------------- | ------- | --------------------------------------- |
| `items` | `TooltipItem[]` | —       | Array of items to display (required)    |
| `class` | `string`        | —       | Additional CSS classes on the container |

`TooltipItem` shape: `{ id: number | string; name: string; designation: string; image: string }`.

## Implementation notes

- Rotation and horizontal translation are both derived from the same value: `mouseX`, the pointer's offset from the hovered avatar's horizontal center, scaled by `/100 * 50`. One `$derived` value drives both the `rotate()` and the `translateX()` in the tooltip's inline `style`.
- `mouseX` is recalculated from scratch on `mouseenter` (not carried over from the previous avatar) to avoid a jump when the pointer moves between adjacent, overlapping avatars.
- The tooltip is conditionally rendered (`{#if hoveredIndex === item.id}`) rather than always mounted and toggled with opacity, so it uses Svelte's `transition:scale` (200ms, `start: 0.6`) on enter/exit instead of a CSS-only transition.
- Avatars overlap via a `-mr-4` negative margin on each item and `group-hover:z-30`/`scale-105` to lift the hovered one above its neighbors.
- No `prefers-reduced-motion` handling — the scale transition and position/rotation tracking run regardless of user preference.
