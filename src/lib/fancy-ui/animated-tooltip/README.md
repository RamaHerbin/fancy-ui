# AnimatedTooltip

A presence stack: a row of overlapping avatars, each wrapped in a thin presence ring. Hovering or focusing an avatar lights its ring, lifts it slightly and parts its neighbours to make room, while a small glass card rises above it with the person's name and role. The card leans and slides toward the pointer, and a single line of light sweeps once under the name as it opens.

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

<!-- A warm ring and larger avatars -->
<AnimatedTooltip items={people} accent="#f0a36e" size={72} />
```

## Props

| Prop     | Type            | Default | Description                                                                                                                            |
| -------- | --------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `items`  | `TooltipItem[]` | —       | Array of items to display (required)                                                                                                   |
| `class`  | `string`        | —       | Additional CSS classes on the container                                                                                                |
| `accent` | `string`        | —       | Tint of the presence ring and the sweep under the name. Any CSS colour. Unset = a soft lilac/ice iridescent pair tuned for each theme. |
| `size`   | `number`        | `56`    | Avatar diameter in pixels. The overlap, ring and pointer lean all scale with it.                                                       |

`TooltipItem` shape: `{ id: number | string; name: string; designation: string; image: string }`.

### CSS custom properties

Set these on the component (or any ancestor) through `class` or `style` to theme it without props.

| Variable         | Purpose                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `--at-accent`    | First ring colour (the `accent` prop writes this).                                                           |
| `--at-accent-2`  | Second ring colour. The `accent` prop derives it as a lighter mix of the accent.                             |
| `--at-separator` | Colour of the hairline that separates stacked avatars. Defaults to `--background`; match it to your surface. |

## The look

- **Presence ring.** Each avatar sits in a 2px conic ring (accent → second accent → a short white-hot arc) with a 1px gap before the photo, and a 2px hairline in the separator colour outside it so stacked avatars read as cut out of each other. The ring rests at 35% opacity and goes to full on hover or focus, with a soft blurred halo behind it. The conic start angle turns 140° as it lights.
- **Make room.** The active avatar lifts (`translateY(-4px) scale(1.08)`); its immediate neighbours slide 6px away from it and the next ones 2px, all on the house arrival curve.
- **Glass card.** Translucent surface (`rgba(255,255,255,.85)` light, `rgba(20,20,22,.85)` dark), 12px backdrop blur, 10px radius, hairline border, a top inner highlight, a soft shadow and a small pointer notch. It rises with a lightly overshooting curve over 260ms and settles down on exit.
- **Light sweep.** A 1px hairline in the accent pair sits under the name; a haloed glint crosses it once, left to right, when the card opens.

## Reduced motion

With `prefers-reduced-motion: reduce` the card simply fades in and out. There is no lift, no parting, no lean or tilt, no ring rotation and no sweep; the ring still lights and the resting hairline under the name is still drawn, so the composition matches the animated version at rest.

## Implementation notes

- `mouseX` is the pointer's offset from the hovered avatar's centre, normalised by half the avatar size to `[-1, 1]`. The card leans up to 7° and slides up to 14px from it. The follow is smoothed with a short CSS transition on the card's positioner, while the entrance keyframe runs on an inner element, so the two transforms never fight.
- `mouseX` is recalculated from scratch on `mouseenter` (not carried over from the previous avatar) to avoid a jump when the pointer moves between adjacent, overlapping avatars.
- The hovered item carries `data-active` and the `at-active` class; parted neighbours carry `at-parted`, `data-part="before" | "after"` and a `--_at-shift` value. The avatar gets `at-lifted` only when motion is allowed.
- Avatars overlap by `0.285 × size` (16px at the default 56px); the last one has no negative margin, so the row stays centred.
- Each avatar wrapper is keyboard-focusable (`tabindex="0"`) and shows the tooltip on `focusin`/`focusout` as well as mouse hover, so keyboard and touch users can reach the designation, not just mouse users. The lit ring doubles as the focus indicator. The tooltip carries `role="tooltip"` and an id, referenced by the wrapper's `aria-describedby` only while it is shown. Ring, halo, separator and sweep layers are all `aria-hidden`.
