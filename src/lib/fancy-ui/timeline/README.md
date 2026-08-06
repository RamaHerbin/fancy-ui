# Timeline

A vertical timeline with scroll-driven progress line and sticky labels.

## Features

- **Scroll-driven progress**: Gradient line (purple → blue) grows as user scrolls
- **Sticky labels**: Item labels stay visible while scrolling through content
- **Dot indicators**: Visual markers on the timeline line
- **Responsive**: Labels hidden on mobile, full layout on desktop
- **ResizeObserver**: Recalculates height on layout changes

## Props

| Prop          | Type             | Default | Description                            |
| ------------- | ---------------- | ------- | -------------------------------------- |
| `items`       | `TimelineItem[]` | `[]`    | Timeline entries with `id` and `label` |
| `title`       | `string`         | —       | Heading text above the timeline        |
| `description` | `string`         | —       | Subheading text                        |
| `class`       | `string`         | `''`    | Additional CSS classes                 |

## Snippets

| Snippet   | Args                   | Description                              |
| --------- | ---------------------- | ---------------------------------------- |
| `content` | `(item: TimelineItem)` | Content rendered for each timeline entry |

## Usage

```svelte
<script>
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "step-1", label: "2024" },
		{ id: "step-2", label: "2023" },
	];
</script>

<Timeline {items} title="My Journey">
	{#snippet content(item)}
		{#if item.id === "step-1"}
			<p>First step content</p>
		{:else if item.id === "step-2"}
			<p>Second step content</p>
		{/if}
	{/snippet}
</Timeline>
```

## Implementation Notes

- Replaced `motion-v` `useScroll` / `useTransform` with a native scroll event listener
- Replaced Vue named slots (`<slot :name="item.id">`) with a single `content` snippet that receives the item
- Uses ResizeObserver to keep timeline height in sync
- Uses theme tokens (`bg-background`, `text-foreground`) instead of hardcoded colors
