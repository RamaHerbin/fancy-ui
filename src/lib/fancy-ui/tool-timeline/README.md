# ToolTimeline

A compact session summary of what an agent actually did: one row per tool call, on a vertical rail, with the file it touched, how much it changed, and when.

This is the "what happened" panel you put under a finished answer or beside a running session — a log the reader skims top to bottom, not a feature the reader scrolls through.

> **Not to be confused with [`timeline`](../timeline).** `timeline` is a scroll-driven **content** timeline: a full-width marketing layout with sticky headings and a gradient progress line that fills as the page scrolls. `tool-timeline` is a dense **activity** log for agent tool calls, sized to sit inside a card. They share a name and a vertical rail, and nothing else — different data, different density, different job.

## Usage

```svelte
<script lang="ts">
	import { ToolTimeline } from "fancy-ui-svelte";
	import type { ToolTimelineItemData } from "fancy-ui-svelte";

	const items: ToolTimelineItemData[] = [
		{
			id: "read-utils",
			verb: "Read",
			target: "src/lib/utils.ts",
			detail: "Looking for the class merge helper",
			timestamp: Date.now() - 6 * 60_000,
		},
		{
			id: "edit-page",
			verb: "Edited",
			target: "src/routes/+page.svelte",
			additions: 24,
			deletions: 7,
			timestamp: Date.now() - 3 * 60_000,
		},
	];
</script>

<ToolTimeline {items} />
```

```svelte
<!-- Tighter rows for a sidebar, and rows that open the underlying tool call -->
<ToolTimeline {items} compact onSelect={(item, index) => open(item, index)} />
```

```svelte
<!-- Own the row body outright; the rail and its dot stay -->
<ToolTimeline {items}>
	{#snippet item(entry, index)}
		<span class="flex-1">{index + 1}. {entry.verb} {entry.target}</span>
	{/snippet}
</ToolTimeline>
```

## Props

| Prop       | Type                                                  | Default      | Description                                                          |
| ---------- | ----------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `items`    | `ToolTimelineItemData[]`                              | —            | The agent's activity log, oldest first (required)                    |
| `onSelect` | `(item: ToolTimelineItemData, index: number) => void` | —            | Called when a row is activated; supplying it turns rows into buttons |
| `compact`  | `boolean`                                             | `false`      | Tighter rows with the detail line dropped                            |
| `label`    | `string`                                              | `"Activity"` | Accessible name for the list                                         |
| `class`    | `string`                                              | —            | Additional CSS classes                                               |
| `ref`      | `HTMLDivElement \| null`                              | `null`       | Bindable element reference                                           |

## Snippets

| Snippet | Args                                  | Description                                              |
| ------- | ------------------------------------- | -------------------------------------------------------- |
| `item`  | `(item: ToolTimelineItemData, index)` | Replaces the built-in row body, keeping the rail and dot |

## The row

Each entry is a `ToolTimelineItemData` from the shared AI data model, so the same object can come straight off a tool-call stream:

- **`verb` + `target`** — what was done and to what. The verb is emphasised, the target is monospaced and truncates on overflow with the full string kept in a `title` attribute, so a long path never widens the card.
- **`detail`** — a muted second line, dropped entirely in `compact` mode.
- **`additions` / `deletions`** — right-aligned `+N` / `−N` in `tabular-nums`, rendered only for the entries that carry them, and independently of each other. `0` is a value, not an absence: `additions: 0` renders `+0`.
- **`timestamp`** — a relative time ("5 minutes ago") via `_internals/relative-time`, with the exact instant in both `datetime` and `title`.

## Implementation notes

- Rows are a real `<ol>` / `<li>` list under an `aria-label`, so assistive tech reports the activity count and position rather than a wall of text.
- The `{#each}` is keyed by `item.id`. That is what makes an appended entry mount as a fresh node and play the entrance animation by itself, while the rows already on screen keep their DOM nodes and stay put. Reusing indices as keys would animate the wrong row.
- The entrance (a short fade and 4px slide) lives entirely inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion is therefore not a degraded variant to keep in sync: with the rule gone, a new row simply appears at its final position and opacity.
- The connecting line is a `::before` on each row rather than one absolutely-positioned line behind the list, so it stretches with the row it belongs to and needs no height measurement or `ResizeObserver`. The first and last rows trim it to their dot, and a lone row hides it — the rail never overshoots into empty space.
- `onSelect` is the only thing that decides the row element: with it, each row is a `<button type="button">` with hover and focus-visible affordances; without it, a plain span with no tab stop and no pointer cursor. There is no "clickable" prop to keep in sync with the handler.
- The diff stats carry `role="img"` alongside their `aria-label` ("24 additions"). On a bare span an `aria-label` is ignored, and `+24` on its own is announced as a bare number.
- Rail and dot colours are `color-mix` fades of `currentColor`, so one set of values reads correctly in both themes. The stat colours cannot borrow that trick — they are text against the page, and a single mid-lightness hue measures under 4.5:1 on white — so they come from the shared `--ft-status-*` vocabulary instead, whose defaults are per-theme `light-dark()` pairs.
- `ft-tooltimeline-compact` is applied with a `class:` directive rather than through `cn()`, so the compiler can see the class is used and does not prune its scoped rule.

## CSS variables

Set on the root element to restyle without a fork:

| Variable                           | Default                                    | Controls                            |
| ---------------------------------- | ------------------------------------------ | ----------------------------------- |
| `--ft-tooltimeline-rail`           | `color-mix(in oklab, currentColor 16%, …)` | The connecting line                 |
| `--ft-tooltimeline-dot`            | `color-mix(in oklab, currentColor 38%, …)` | The per-row dot                     |
| `--ft-tooltimeline-additions`      | `--ft-status-done`                         | `+N` colour                         |
| `--ft-tooltimeline-deletions`      | `--ft-status-error`                        | `−N` colour                         |
| `--ft-tooltimeline-row-pad`        | `0.375rem` (`0.125rem` compact)            | Vertical row padding                |
| `--ft-tooltimeline-enter-duration` | `320ms`                                    | Entrance animation duration         |
| `--ft-tooltimeline-dot-size`       | `0.5rem`                                   | Dot diameter                        |
| `--ft-tooltimeline-rail-x`         | `0.25rem`                                  | Rail centre, shared by line and dot |

The two stat colours default to the run-status vocabulary shared with `ToolCall`, `TerminalBlock`, `CodeDiff` and `ChatError` — `--ft-status-done` and `--ft-status-error`. Set those to recolour success and failure across the whole family; set the `--ft-tooltimeline-*` names to change this list alone.

Both defaults are `light-dark()` pairs — `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` for `+N`, `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)` for `−N` — because those tallies are text and one token cannot clear 4.5:1 against both white and near-black. Declare `color-scheme: light` / `dark` on your theme so the right half is picked; without it a page gets the light half. See the [ToolCall README](../tool-call/README.md#styling) for the full palette.
