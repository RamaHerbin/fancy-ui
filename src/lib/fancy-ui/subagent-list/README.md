# SubagentList

The fan-out panel: one row per delegated worker, each with its own status dot, the task it was handed, and how far along it is. This is what you put under an orchestrator's answer while it waits for its workers — a list the reader scans for "who is still out there", not a feature they interact with.

## Components

- `SubagentList` — the whole list; there are no sub-parts to assemble

## Usage

```svelte
<script lang="ts">
	import { SubagentList } from "fancy-ui-svelte";
	import type { SubagentData } from "fancy-ui-svelte";

	const agents: SubagentData[] = [
		{
			id: "researcher",
			name: "Researcher",
			task: "Read the changelog for breaking changes",
			status: "running",
			progress: 0.62,
			model: "mini",
		},
		{
			id: "writer",
			name: "Writer",
			task: "Draft the migration note",
			status: "done",
			model: "pro",
		},
	];
</script>

<SubagentList {agents} />
```

```svelte
<!-- Tighter rows for a sidebar, and rows that open the worker's transcript -->
<SubagentList {agents} compact onSelect={(agent, index) => open(agent, index)} />
```

```svelte
<!-- Own the row body outright; the status dot stays -->
<SubagentList {agents}>
	{#snippet item(agent, index)}
		<span class="flex-1">{index + 1}. {agent.name}</span>
	{/snippet}
</SubagentList>
```

## The data contract

Each entry is a `SubagentData` from the shared AI data model, so the same object can come straight off an orchestrator's fan-out without translation:

```ts
interface SubagentData {
	id: string;
	name: string;
	task: string;
	status: "pending" | "running" | "done" | "error" | "cancelled";
	progress?: number; // 0–1
	model?: string;
}
```

Only `id`, `name`, `task` and `status` are required. `progress` and `model` render when they arrive: send the row without them while the worker is queued, then the same row with a fraction once it starts reporting.

## Props

| Prop       | Type                                           | Default     | Description                                                          |
| ---------- | ---------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `agents`   | `SubagentData[]`                               | —           | The delegated workers, in the order they were spawned (required)     |
| `label`    | `string`                                       | `undefined` | Accessible name for the list; derived from the statuses when unset   |
| `onSelect` | `(agent: SubagentData, index: number) => void` | `undefined` | Called when a row is activated; supplying it turns rows into buttons |
| `compact`  | `boolean`                                      | `false`     | Tighter rows with the task line dropped                              |
| `class`    | `string`                                       | `undefined` | Additional CSS classes                                               |
| `ref`      | `HTMLDivElement \| null`                       | `null`      | Bindable reference to the root element                               |

## Snippets

| Snippet | Args                           | Description                                     |
| ------- | ------------------------------ | ----------------------------------------------- |
| `item`  | `(agent: SubagentData, index)` | Replaces the built-in row body, keeping the dot |

## The row

- **Status dot** — filled for running, done and error; hollow for pending and cancelled. Colour comes from the `--ft-status-*` vocabulary this family shares, and a running dot breathes.
- **Name** — emphasised, truncating on overflow with the full string in a `title`.
- **Model badge** — a tiny muted monospace pill, rendered only for the workers that name a model, so a homogeneous fan-out stays quiet.
- **Task** — a muted second line, dropped entirely in `compact` mode.
- **Progress or a word** — a thin bar for a running worker that reported a `progress`, otherwise the status in words (`pending`, `running`, `done`, `error`, `cancelled`).

## The derived label

Left unset, `label` is computed from the statuses, because the one number a fan-out is read for is how many workers are still out there:

| State                              | Accessible name       |
| ---------------------------------- | --------------------- |
| Anything running                   | `"2 agents running"`  |
| Nothing running, all settled       | `"3 agents finished"` |
| Nothing running, some still queued | `"3 agents"`          |
| No agents at all                   | `"No agents"`         |

"Settled" covers `error` and `cancelled` as well as `done` — a worker that failed is no longer out there. The count is the running tally in the first row of that table and the headcount everywhere else, and singular reads as `"1 agent running"`. Pass `label` and it wins outright, unchanged.

The label is the list's accessible name only; it is not rendered. Put your own heading above the list if you want the count on screen.

## Implementation notes

- Rows are a real `<ul>` / `<li>` list, with `role="list"` stated rather than left implicit — `list-style: none` strips list semantics in Safari, and the count of workers is exactly what assistive tech should report here.
- The `{#each}` is keyed by `agent.id` alone. That is what makes a newly spawned worker mount as a fresh node and play the entrance by itself, while the rows already on screen keep their DOM nodes and stay put — keying on the position would animate the wrong row, and would replay every entrance the moment the list is reordered. The ids come from a model, so a repeated one would crash the block: the second and later rows under an id get an occurrence suffix, which counts repeats rather than positions and so survives a reorder too.
- A running row with a progress bar has no visible caption to speak for it, and `progressbar` is children-presentational, so neither its label nor its value reaches the name of the button around it. Those rows carry the status and the percentage in a screen-reader-only span instead — "Running, 62%".
- **A bar is a claim that something is moving**, so only a running worker that reported a number gets one. A finished row with a stale `progress: 1` left on it shows `done` in words, not a full bar.
- `progress` is clamped into `0–1` at the point of use: a worker reporting `1.4` fills the track rather than overrunning it, and a negative number empties it.
- The bar is a real `role="progressbar"` with `aria-valuenow` in whole percent, named "Running" — so the status is never carried by colour alone. Rows without a bar say their status in visible words instead, which is why there is no screen-reader-only duplicate on a default row. Replace the body with `item` and that duplicate reappears, since your markup cannot be asked to speak the status for us.
- `onSelect` alone decides the row element: with it, each row is a `<button type="button">` with hover and focus-visible affordances; without it, a plain span with no tab stop and no pointer cursor. There is no "clickable" prop to keep in sync with the handler.
- Every animation — the entrance, the bar's width transition, the running pulse — lives inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion is therefore not a degraded variant to keep in sync: with those rules gone a new worker appears at its final position, the bar jumps to its width, and a running dot is still a filled accent dot.
- `ft-subagents-compact` is applied with a `class:` directive rather than through `cn()`, so the compiler can see the class is used and does not prune its scoped rule.
- Nothing is scheduled and no DOM is touched at construction time, so the list renders under SSR unchanged.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable                | Default (light / dark)                         | Meaning                      |
| ----------------------- | ---------------------------------------------- | ---------------------------- |
| `--ft-status-pending`   | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Queued, nothing has run yet  |
| `--ft-status-running`   | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | In flight                    |
| `--ft-status-done`      | `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` | Succeeded                    |
| `--ft-status-error`     | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | Failed                       |
| `--ft-status-cancelled` | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Abandoned before it finished |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it** — see the [ToolCall README](../tool-call/README.md#styling) for the full explanation.

The `--ft-subagents-*` names sit in front of the shared ones, for the case where this list alone should differ:

| Variable                        | Default                          | Controls                           |
| ------------------------------- | -------------------------------- | ---------------------------------- |
| `--ft-subagents-pending`        | `--ft-status-pending` at 55%     | Hollow dot, pending                |
| `--ft-subagents-running`        | `--ft-status-running`            | Dot and its pulse, running         |
| `--ft-subagents-done`           | `--ft-status-done`               | Dot, finished                      |
| `--ft-subagents-error`          | `--ft-status-error`              | Dot, failed                        |
| `--ft-subagents-cancelled`      | `--ft-status-cancelled` at 40%   | Hollow dot, cancelled              |
| `--ft-subagents-bar`            | `--ft-status-running`            | Progress fill                      |
| `--ft-subagents-track`          | `currentColor` at 14%            | Progress track                     |
| `--ft-subagents-track-width`    | `3.5rem`                         | Track length                       |
| `--ft-subagents-track-height`   | `0.25rem`                        | Track thickness                    |
| `--ft-subagents-badge-bg`       | `currentColor` at 8%             | Model badge background             |
| `--ft-subagents-dot-size`       | `0.5rem`                         | Dot diameter                       |
| `--ft-subagents-row-pad`        | `0.375rem` (`0.1875rem` compact) | Vertical row padding               |
| `--ft-subagents-enter-duration` | `320ms`                          | Row entrance duration              |
| `--ft-subagents-fill-duration`  | `320ms`                          | How long the bar takes to catch up |
