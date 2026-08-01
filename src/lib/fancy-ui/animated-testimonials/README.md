# AnimatedTestimonials

A testimonial carousel that cross-fades between quote/author pairs, with a matching stack of avatar images that slide and rotate in behind it. Supports manual prev/next navigation and optional autoplay that pauses on hover.

## Usage

```svelte
<script lang="ts">
	import { AnimatedTestimonials } from "fancy-ui-svelte";
	import type { Testimonial } from "fancy-ui-svelte";

	const testimonials: Testimonial[] = [
		{
			quote:
				"The attention to detail and innovative features have completely transformed our workflow.",
			name: "Sarah Chen",
			designation: "Product Manager at TechFlow",
			src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500",
		},
	];
</script>

<AnimatedTestimonials {testimonials} autoplay interval={4000} />
```

## Props

| Prop           | Type            | Default | Description                                 |
| -------------- | --------------- | ------- | ------------------------------------------- |
| `testimonials` | `Testimonial[]` | —       | Array of testimonials to display (required) |
| `autoplay`     | `boolean`       | `false` | Auto-advance testimonials                   |
| `interval`     | `number`        | `5000`  | Interval between auto-advances (ms)         |
| `class`        | `string`        | —       | Additional CSS classes on the root          |

`Testimonial` shape: `{ quote: string; name: string; designation: string; src: string }` — `src` is the author's avatar image URL.

## Implementation notes

- `navigate()` is guarded by an `isAnimating` flag so rapid clicks or a running autoplay timer can't overlap two transitions; a new navigation is dropped, not queued, while one is in flight.
- Autoplay is a single `$effect` that starts a `setInterval` whenever `autoplay`, `interval`, or hover state changes, and returns its own cleanup — hovering the container (`onmouseenter`/`onmouseleave`) pauses it without a separate timer to manage.
- The image stack renders every testimonial absolutely-positioned and stacked (`z-20`/`z-10`), swapping visibility and transform per index rather than mounting/unmounting nodes — this is what makes the slide-in-behind effect possible without a Svelte transition.
- The image and text transition durations are both tied to the same `TRANSITION_DURATION` module constant (300ms); it isn't exposed as a prop, so it must be edited in the component source if a different pace is needed.
- Renders a "No testimonials available." message instead of the carousel when `testimonials` is empty, rather than crashing on an out-of-bounds `activeIndex`.
- No `prefers-reduced-motion` handling — the slide/scale/opacity transitions run regardless of user preference.
