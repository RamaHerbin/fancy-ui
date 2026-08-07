# ButtonGroup

Joins a row (or a stack) of adjacent actions into one seamless control: one border around the whole thing, one divider between items, no doubled edges. It is purely presentational — selection state (which item is "on") is the caller's business, not this component's. Reach for [ToggleGroup](../toggle-group/README.md) instead when the items represent a choice rather than independent actions.

## Usage

```svelte
<script lang="ts">
	import { Button, ButtonGroup } from "fancy-ui-svelte";
</script>

<ButtonGroup label="Clipboard actions">
	<Button variant="outline">Cut</Button>
	<Button variant="outline">Copy</Button>
	<Button variant="outline">Paste</Button>
</ButtonGroup>
```

Any interactive element works inside it — a `Button`, a plain `<button>`, an `<a>` — ButtonGroup only reaches into the elements it is given to strip their own border and corners; it never renders them itself.

```svelte
<!-- A segmented control: the "selected" state is the demo's own, not ButtonGroup's -->
<script lang="ts">
	const ranges = ["Day", "Week", "Month"];
	let active = $state("Day");
</script>

<ButtonGroup label="Time range">
	{#each ranges as range (range)}
		<Button variant={range === active ? "secondary" : "ghost"} onclick={() => (active = range)}>
			{range}
		</Button>
	{/each}
</ButtonGroup>
```

```svelte
<!-- Split action: a wide primary item and a narrow trailing one, same seam -->
<ButtonGroup label="Save document">
	<Button variant="secondary">Save</Button>
	<Button variant="secondary" class="px-[10px]" label="More save options">▼</Button>
</ButtonGroup>
```

```svelte
<!-- orientation="vertical" stacks the items and rotates the divider onto the same axis -->
<ButtonGroup orientation="vertical" label="Panel position">
	<Button variant="outline">Top</Button>
	<Button variant="outline">Middle</Button>
	<Button variant="outline">Bottom</Button>
</ButtonGroup>
```

## Props

| Prop          | Type                         | Default        | Description                                            |
| ------------- | ---------------------------- | -------------- | ------------------------------------------------------ |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Stacking axis for the joined items                     |
| `label`       | `string`                     | —              | Accessible name for the group, exposed as `aria-label` |
| `children`    | `Snippet`                    | —              | The adjacent actions to join                           |
| `class`       | `string`                     | —              | Additional CSS classes                                 |
| `ref`         | `HTMLDivElement \| null`     | `null`         | Bindable reference to the root `<div>`                 |

## The context contract

The root publishes its orientation under `BUTTON_GROUP_CONTEXT_KEY`, so a nested control can adapt its own layout without the value being threaded down as a prop:

```ts
interface ButtonGroupContext {
	readonly orientation: "horizontal" | "vertical";
}
```

```svelte
<script lang="ts">
	import { getContext } from "svelte";
	import { BUTTON_GROUP_CONTEXT_KEY, type ButtonGroupContext } from "fancy-ui-svelte";

	const group = getContext<ButtonGroupContext | undefined>(BUTTON_GROUP_CONTEXT_KEY);
</script>
```

Read it as optional — a control rendered outside a `ButtonGroup` gets `undefined` rather than throwing.

## Implementation notes

- The seam is CSS-only. The root owns the border and the radius; a `:global()` descendant rule strips every child's own border and radius, then a second rule restores the container's rounded corners on the first and last child only (`inherit`, so it always tracks the container's actual radius rather than a second hardcoded value). The divider is a single `border-left` (or `border-top`, vertical) on every item but the first, via the adjacent-sibling combinator — no per-item classes to keep in sync.
- Scoped styles are unlayered and Tailwind's utilities are not, so the descendant rule wins over a child's own `rounded-*` / `border-*` classes without needing `!important`.
- No `overflow: hidden` on the root. The first/last child already inherit the container's own radius exactly, so nothing ever renders past its rounded outline that would need clipping — and a clip would have cut every item's focus ring off at the container's edge along with it. The real hazard is a middle item: its ring can bleed into whichever neighbour sits later in source order, and that neighbour's opaque background paints over it. `:focus-visible` lifts the focused item into its own stacking context (`position: relative; z-index: 1`) so the ring draws on top of that neighbour instead.
- `orientation` flips three things together: the flex axis (`flex-row` / `flex-col`), the divider axis, and which pair of corners gets the container's radius restored (left/right for a row, top/bottom for a stack) — one prop, one `data-orientation` attribute the stylesheet keys off.
- The divider reads lighter than the outer border (10% vs. 14%, matching the mockup): a seam between two items already touching, not an edge holding its own against whatever sits outside the group.
