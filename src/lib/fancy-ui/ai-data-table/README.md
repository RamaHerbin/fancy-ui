# AI Data Table

A compact comparison table for the structured answer a model just produced: real `<table>` semantics, tabular figures on the numeric columns, check-or-dash glyphs on the booleans, and one column you can tint as the recommendation.

## Components

- `AiDataTable` — the scrolling wrapper, the table, and its default cell rendering

## Usage

```svelte
<script>
	import { AiDataTable } from "fancy-ui-svelte";

	const columns = [
		{ key: "option", label: "Deployment" },
		{ key: "cost", label: "Cost / 1M req", numeric: true },
		{ key: "selfHosted", label: "Self-hosted", align: "center" },
		{ key: "sla", label: "SLA" },
	];

	const rows = [
		{ option: "Managed cluster", cost: 18.4, selfHosted: false, sla: "99.95%" },
		{ option: "Serverless pool", cost: 6.2, selfHosted: false, sla: "99.9%" },
		{ option: "Self-run nodes", cost: 24.9, selfHosted: true, sla: null },
	];
</script>

<AiDataTable {columns} {rows} caption="Deployment options" highlightColumn="cost" />
```

## It renders the answer, it does not re-open it

**There is no sorting and no filtering, by design.** A model that returns a table has already made two decisions you cannot see: which rows to include, and what order to put them in. "Cheapest first" may be the argument the answer is making. A column header that quietly re-sorts the rows lets a reader take the table apart without the model's reasoning coming with it — and turns a rendered answer into a spreadsheet that no longer says what was said.

So this component renders `rows` in the order it received them, forever. If you need interaction, you need something else above it: sort the array yourself before you pass it, and own the consequences of having done so.

The same rule holds inside a cell. Numbers are printed exactly as they arrived — no rounding, no thousands separators, no currency. `18.4` renders as `18.4`. Formatting is a claim about precision, and it is not this component's claim to make; format the value before it reaches `rows`, or take over the cell with the `cell` snippet.

## The data contract

```ts
interface AiDataTableColumn {
	key: string;
	label: string;
	align?: "left" | "center" | "right";
	numeric?: boolean;
}

type AiDataTableValue = string | number | boolean | null | undefined;
type AiDataTableRow = Record<string, AiDataTableValue>;
```

`columns` fixes the order and the header text; each column's `key` is looked up on every row. A key a row never mentions is not an error — it renders as empty, the same as `null`, because a model answering about three options will routinely know four things about two of them.

## Props

| Prop              | Type                                               | Default     | Description                                         |
| ----------------- | -------------------------------------------------- | ----------- | --------------------------------------------------- |
| `columns`         | `AiDataTableColumn[]`                              | —           | Columns in render order. Required                   |
| `rows`            | `AiDataTableRow[]`                                 | —           | Rows in the order the model produced them. Required |
| `caption`         | `string`                                           | `undefined` | Names the table for assistive tech                  |
| `captionVisible`  | `boolean`                                          | `false`     | Also shows the caption, as a muted line above       |
| `dense`           | `boolean`                                          | `false`     | Tighter rows                                        |
| `highlightColumn` | `string`                                           | `undefined` | Key of the column to tint                           |
| `cell`            | `Snippet<[unknown, { row: number; key: string }]>` | `undefined` | Replaces the default cell rendering                 |
| `class`           | `string`                                           | `undefined` | Additional CSS classes                              |
| `ref`             | `HTMLDivElement \| null`                           | `null`      | Bindable reference to the scrolling root            |

## How a value is rendered

| Value                   | On screen                              | Out loud   |
| ----------------------- | -------------------------------------- | ---------- |
| `string` / `number`     | As-is                                  | As-is      |
| `true`                  | Check glyph, tinted `--ft-status-done` | "True"     |
| `false`                 | Muted en dash `–`                      | "False"    |
| `null` / `""` / missing | Muted em dash `—`                      | "No value" |

Every glyph is `aria-hidden` with the words beside it in a screen-reader-only span, so a boolean column is never a colour-and-shape puzzle for anyone who cannot see it. The two dashes differ on purpose: `–` means the model said no, `—` means the model said nothing — and an empty string is the model saying nothing, so it reads as the em dash rather than as a cell that looks dropped.

## Alignment

`numeric: true` does two things: `tabular-nums`, so digits line up in a column instead of wandering, and right alignment, because that is the edge the eye compares magnitudes along. Set `align` to override — a numeric column of ratings reads better centred:

```svelte
<AiDataTable
	columns={[
		{ key: "score", label: "Score", numeric: true, align: "center" },
		{ key: "name", label: "Model" },
	]}
	{rows}
/>
```

## Taking over a cell

`cell` replaces the default rendering for **every** cell, receiving the raw value and where it sits. Branch on `key` to keep the defaults everywhere else:

```svelte
<AiDataTable {columns} {rows}>
	{#snippet cell(value, { key })}
		{#if key === "sla" && value === null}
			<span class="text-muted-foreground italic">not published</span>
		{:else}
			{value}
		{/if}
	{/snippet}
</AiDataTable>
```

## Accessibility

- A real `<table>` with `<thead>`, `<tbody>`, and `scope="col"` on every header — so a screen reader announces the column when it reads a cell, which is the whole reason to use a table rather than a grid of divs.
- `caption` names the table. It is hidden by default rather than absent, so the name reaches assistive tech without adding a heading nobody asked for; `captionVisible` shows it too.
- Booleans and empties carry text, never colour alone.
- The table sits inside an `overflow-x-auto` wrapper, so a nine-column answer scrolls in place instead of putting the whole page on a horizontal rail.

## Styling

| Variable                 | Default              | Applies to                         |
| ------------------------ | -------------------- | ---------------------------------- |
| `--ft-table-highlight`   | `currentColor` at 5% | The `highlightColumn` tint         |
| `--ft-table-zebra`       | `currentColor` at 3% | The stripe on every other row      |
| `--ft-table-true`        | `--ft-status-done`   | The check glyph                    |
| `--ft-table-pad-y`       | `0.5rem`             | Vertical cell padding              |
| `--ft-table-dense-pad-y` | `0.25rem`            | Vertical cell padding when `dense` |
| `--ft-table-pad-x`       | `0.75rem`            | Horizontal cell padding            |

The check glyph reads `--ft-status-done`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError` — retint that one variable and every component in the family follows. Its default is a `light-dark()` pair, since no single green clears 4.5:1 against both white and near-black, so **your theme must declare `color-scheme`**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Zebra and highlight are both mixes of `currentColor`, so they stay proportionate on a light page and a dark one without being told which they are on. They are also layered rather than blended: the stripe sits on the row and the tint on the cell, so a highlighted cell in a striped row simply paints over the stripe instead of fighting it for one background.

## Implementation Notes

- Nothing animates. There is no transition to shorten and no motion to suppress, so the component renders identically under `prefers-reduced-motion: reduce`.
- Nothing is scheduled and no DOM is touched at construction, so it renders unchanged under SSR.
- Rows and columns are keyed by index, not by `key`, so a model that emits the same column key twice renders a slightly odd table rather than crashing the page.
- The scrolling wrapper is a focusable `region`, named from `caption` (or "Data table" without one). A wide table that only scrolls under a pointer is unreachable for anyone driving the page from the keyboard; the tab stop is what lets them reach the columns off the right edge, and the role and name are what make the stop explicable when they land on it.
