# Marquee

An infinite conveyor of content (a row, or a column with `vertical`) built by rendering several copies of its children side by side and sliding the whole track by `-100% - gap` on a seamless loop.

## The look

- **Eased conveyor.** With `pauseOnHover`, the track does not freeze when the pointer (or keyboard focus) enters: it brakes to a stop over roughly half a second and pulls away again just as smoothly on leave. Under the hood the CSS keyframe is the server-rendered base; once mounted, each track is upgraded to a Web Animations animation whose `playbackRate` is eased toward 0 or 1 by a small `requestAnimationFrame` loop that goes back to sleep as soon as the rate settles. Browsers without `Element.prototype.animate` keep the CSS loop and a plain pause.
- **Edge fades.** By default (`fade`), items dissolve into both edges through an eased alpha mask instead of hitting a hard line. The fade runs along the scroll axis. Its width is the `--marquee-fade` custom property (default `12%`).
- **ReviewCard.** The bundled testimonial card is a nested double frame: a hairline shell holding a hairline inner panel (near-black `#141416` in dark mode, `#fafafa` in light), an avatar sitting in a hairline ring, and quiet typography. On hover the inner panel catches a soft highlight along its top edge.

## Usage

```svelte
<script lang="ts">
	import { Marquee, ReviewCard } from "fancy-ui-svelte";

	const reviews = [
		{ name: "Jack", username: "@jack", body: "Amazing.", img: "https://avatar.vercel.sh/jack" },
	];
</script>

<Marquee pauseOnHover class="[--duration:30s]">
	{#each reviews as review}
		<ReviewCard {...review} />
	{/each}
</Marquee>
```

Two rows moving in opposite directions are just two `<Marquee>`s, one with `reverse`:

```svelte
<Marquee pauseOnHover>
	{#each firstRow as r}
		<ReviewCard {...r} />
	{/each}
</Marquee>
<Marquee reverse pauseOnHover>
	{#each secondRow as r}
		<ReviewCard {...r} />
	{/each}
</Marquee>
```

Faster, with a wider fade:

```svelte
<Marquee speed={1.5} class="[--marquee-fade:20%]">…</Marquee>
```

## Props

| Prop           | Type      | Default | Description                                                                            |
| -------------- | --------- | ------- | -------------------------------------------------------------------------------------- |
| `reverse`      | `boolean` | `false` | Reverse the scroll direction                                                           |
| `pauseOnHover` | `boolean` | `false` | Ease the conveyor to a stop while hovered or focused, and back up on leave             |
| `vertical`     | `boolean` | `false` | Scroll vertically instead of horizontally                                              |
| `repeat`       | `number`  | `4`     | Number of times to repeat the children track                                           |
| `fade`         | `boolean` | `true`  | Dissolve items at both edges with a gradient mask (width via `--marquee-fade`)         |
| `speed`        | `number`  | `1`     | Speed multiplier on top of `--duration` (`2` = twice as fast); `≤ 0` falls back to `1` |
| `class`        | `string`  | —       | Additional CSS classes                                                                 |

Children are the content to repeat and scroll.

### CSS custom properties

| Property         | Default | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| `--duration`     | `40s`   | Time for one full loop at `speed={1}`     |
| `--gap`          | `1rem`  | Space between items and between copies    |
| `--marquee-fade` | `12%`   | Width of each edge fade when `fade` is on |

Set them per instance through `class`, e.g. `class="[--duration:20s] [--gap:2rem]"`.

`ReviewCard` is also exported as a ready-made card for testimonial-style marquees, taking `img`, `name`, `username`, and `body` props. Its colours read public custom properties, so it can be re-themed from a parent class: `--review-card-shell`, `--review-card-panel`, `--review-card-panel-hover`, `--review-card-line`, `--review-card-ink`, `--review-card-muted`, `--review-card-body`.

## Accessibility

- Only the first copy of the children is exposed to assistive tech; every repeated copy carries `aria-hidden="true"`.
- `pauseOnHover` also brakes on keyboard focus (`focusin`), so a focused item inside the marquee stops moving under the reader; it resumes on `focusout`.

## Reduced motion

With `prefers-reduced-motion: reduce` the marquee is a still row (or column): the CSS keyframe is switched off, no Web Animations are created and no frame loop runs. The composition is unchanged, and the edge fades stay. The ReviewCard hover state (lighter panel, top-edge highlight) switches instantly instead of fading in.

## Implementation notes

- The loop distance is exactly one copy plus one gap, so too low a `repeat` on narrow content can leave a visible gap on wide viewports.
- When the script takes over, it starts each animation where the CSS keyframe already was, then adds the `marquee-upgraded` class to the root, which turns the CSS keyframe off so the track is never moved twice.
- Changing `reverse`, `vertical`, `repeat` or `class` rebuilds the animations from the current position; changing `speed` only updates the playback rate.
