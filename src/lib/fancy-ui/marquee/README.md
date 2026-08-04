# Marquee

An infinite scrolling row (or column) of content, built by rendering multiple copies of its children side by side and animating the whole track by `-100% - gap` on a seamless loop — no JS-measured widths, no `requestAnimationFrame`.

## Usage

```svelte
<script lang="ts">
	import { Marquee, ReviewCard } from "fancy-ui-svelte";

	const reviews = [
		{ name: "Jack", username: "@jack", body: "Amazing.", img: "https://avatar.vercel.sh/jack" },
	];
</script>

<Marquee pauseOnHover class="[--duration:20s]">
	{#each reviews as review}
		<ReviewCard {...review} />
	{/each}
</Marquee>
```

Two rows scrolling in opposite directions (a common pattern) are just two `<Marquee>`s, one with `reverse`:

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

## Props

| Prop           | Type      | Default | Description                                  |
| -------------- | --------- | ------- | -------------------------------------------- |
| `reverse`      | `boolean` | `false` | Reverse the scroll direction                 |
| `pauseOnHover` | `boolean` | `false` | Pause the animation on hover                 |
| `vertical`     | `boolean` | `false` | Scroll vertically instead of horizontally    |
| `repeat`       | `number`  | `4`     | Number of times to repeat the children track |
| `class`        | `string`  | —       | Additional CSS classes                       |

Children are the content to repeat and scroll.

`ReviewCard` is also exported as a ready-made card for testimonial-style marquees, taking `img`, `name`, `username`, and `body` props — its own prop type isn't re-exported as a named type, so consumers writing their own card don't need to match its shape exactly.

## Implementation notes

- Speed and gap are CSS custom properties (`--duration: 40s`, `--gap: 1rem` by default) set on the root and overridable per-instance via `class="[--duration:20s]"` — there's no `speed`/`gap` prop.
- The seamless loop works because `repeat` renders that many identical copies of `children` in a row and animates the whole flex track by exactly `-100% - var(--gap)` (one child-set width) — too low a `repeat` on a narrow set of children can leave a visible gap on wide viewports.
- `pauseOnHover` pauses via `group-hover:[animation-play-state:paused]` on the whole marquee group, not per-item.
- No `prefers-reduced-motion` handling — the scroll animation runs continuously regardless of user preference.
