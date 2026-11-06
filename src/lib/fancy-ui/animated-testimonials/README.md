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

| Prop           | Type            | Default | Description                                                                                                |
| -------------- | --------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `testimonials` | `Testimonial[]` | —       | Array of testimonials to display (required)                                                                |
| `autoplay`     | `boolean`       | `false` | Auto-advance testimonials                                                                                  |
| `interval`     | `number`        | `5000`  | Interval between auto-advances (ms)                                                                        |
| `class`        | `string`        | —       | Additional CSS classes on the root                                                                         |
| `sound`        | `boolean`       | `false` | Plays the `select` cue when Previous or Next moves to another testimonial, once the user has enabled sound |

`Testimonial` shape: `{ quote: string; name: string; designation: string; src: string }` — `src` is the author's avatar image URL.

## Sound

Set `sound` to play the `select` cue when the Previous or Next control moves to another testimonial, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<AnimatedTestimonials {testimonials} sound />
```

It is opt-in and silent by default: nothing plays unless both `sound` is set and the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). The cue is gesture-only — `navigate()` takes an internal `fromUser` flag that only the two button `onclick`s set to `true`, so the autoplay `$effect`'s own call to `navigate("next")` never plays it; without that split, autoplay would turn into a metronome. It also respects the existing `isAnimating` guard (a click mid-transition plays nothing) and requires more than one testimonial, since a single-item carousel "advances" back to the same index.

## Implementation notes

- `navigate()` is guarded by an `isAnimating` flag so rapid clicks or a running autoplay timer can't overlap two transitions; a new navigation is dropped, not queued, while one is in flight.
- Autoplay is a single `$effect` that starts a `setInterval` whenever `autoplay`, `interval`, or hover state changes, and returns its own cleanup — hovering the container (`onmouseenter`/`onmouseleave`) pauses it without a separate timer to manage.
- The image stack renders every testimonial absolutely-positioned and stacked (`z-20`/`z-10`), swapping visibility and transform per index rather than mounting/unmounting nodes — this is what makes the slide-in-behind effect possible without a Svelte transition.
- The `isAnimating` latch uses the `TRANSITION_DURATION` module constant (300ms), and the image and text transitions use the matching `motion-safe:duration-300` utility; it is not a prop, so both must be edited in the component source if a different pace is needed.
- Renders a "No testimonials available." message instead of the carousel when `testimonials` is empty, rather than crashing on an out-of-bounds `activeIndex`.
- Autoplay also pauses while keyboard focus is inside the region (`focusin`/`focusout`), and the slide/fade transitions are gated by Tailwind `motion-safe:` variants; see Reduced motion.

## Reduced motion

With `prefers-reduced-motion: reduce` autoplay never starts and the slide, scale and fade transitions are dropped: the previous and next buttons still change the testimonial, in the same tick as the press: no 300 ms wait and no blank quote in between (without a reduce preference the swap still waits for the slide). The preference is read live, so autoplay resumes if it changes back.
