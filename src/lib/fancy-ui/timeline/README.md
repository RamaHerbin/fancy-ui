# Timeline

A vertical timeline drawn as a light rail: a hairline track, a small glowing head that travels down it as the page scrolls, and a dot per entry that lights up when the head reaches it.

## The look

- **Rail**: a 1px hairline (`rgba(0,0,0,.12)` light, `rgba(255,255,255,.12)` dark), full height, faded out at both ends.
- **Head**: a small bright core (a white-hot mix of the accent in dark mode, the accent itself in light mode) inside a soft ~24px blurred halo, with a short bright streak above it. It sits on the _reading line_, the same line a sticky label docks on, so the current entry's dot always rests right under it.
- **Trail**: the part of the rail the head has already covered is tinted with the accent, brightest just behind the head and fading out further up.
- **Dots**: each entry's dot is a hollow hairline ring until the head reaches it, then it ignites: it settles from 80% to full size (~260ms), fills with a solid core, gains a small glow and sends out one faint ring.
- **Labels**: each label has a small mono index above it (`01`, `02`, …). The entry under the head is bright with a slight accent tint, entries already passed dim to 50%, entries still ahead stay muted.

Scroll handling is `rafThrottle`d: one layout read per frame, and the only write is the `--tl-progress` custom property (in px) on the root. Track height and dot offsets are measured on resize only.

## Props

| Prop          | Type             | Default                             | Description                                                     |
| ------------- | ---------------- | ----------------------------------- | --------------------------------------------------------------- |
| `items`       | `TimelineItem[]` | `[]`                                | Timeline entries with `id` and `label`                          |
| `title`       | `string`         | —                                   | Heading text above the timeline                                 |
| `description` | `string`         | —                                   | Subheading text                                                 |
| `accent`      | `string`         | theme `--primary`, else soft violet | Colour of the head, its trail and the lit dots. Any CSS colour. |
| `class`       | `string`         | `''`                                | Additional CSS classes                                          |

## Snippets

| Snippet   | Args                   | Description                              |
| --------- | ---------------------- | ---------------------------------------- |
| `content` | `(item: TimelineItem)` | Content rendered for each timeline entry |

## Theming

| CSS variable        | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `--timeline-accent` | Same as the `accent` prop, settable from a class. The prop wins when both are set.       |
| `--tl-progress`     | Written by the component: the head's offset from the top of the track, in px. Read-only. |

## Usage

```svelte
<script>
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "v2", label: "v2.0" },
		{ id: "v1", label: "v1.0" },
	];
</script>

<Timeline {items} title="Changelog" accent="oklch(0.76 0.13 190)">
	{#snippet content(item)}
		{#if item.id === "v2"}
			<p>Second release notes</p>
		{:else if item.id === "v1"}
			<p>First release notes</p>
		{/if}
	{/snippet}
</Timeline>
```

## Reduced motion

With `prefers-reduced-motion: reduce` the head, its halo and its streak are not rendered. The rail fills with a plain accent line up to the reading position, and dots still light by position but switch state instantly (the 80% to full size step has no transition), with no glow or ring.

## Implementation notes

- Sticky labels dock at `top-40`. The reading line is that sticky offset plus the dot's centre, so it follows any change you make to the label's `top`.
- When an ancestor has `overflow` set (so the labels cannot stick), the head still sits on the same line and dots light as they scroll up through it.
- Every decorative layer (rail, head, dots, index numbers) is `aria-hidden`; the labels stay real `h3` headings.
