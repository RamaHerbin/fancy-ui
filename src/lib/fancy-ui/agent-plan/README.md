# Agent Plan

What the agent means to do and how far down the list it has got: a header with a done/total count and a thin completion bar, then one row per step with a glyph for its state and its substeps indented under a rail.

## Components

- `AgentPlan` — header, progress bar, and the flattened step list

## Usage

```svelte
<script>
	import { AgentPlan } from "fancy-ui-svelte";

	const steps = [
		{ id: "s1", label: "Read the failing test", status: "done", detail: "tests/retry.spec.ts" },
		{
			id: "s2",
			label: "Locate the retry helper",
			status: "running",
			substeps: [
				{ id: "s2a", label: "Search for retryWithBackoff", status: "done" },
				{ id: "s2b", label: "Open the module it lives in", status: "running" },
			],
		},
		{ id: "s3", label: "Run the suite", status: "pending" },
	];
</script>

<AgentPlan {steps} label="Fix the retry backoff" />
```

## The data contract

Each entry is a `PlanStepData`, the shape shared by every component in this family — the same objects can flow from a plan tree into a task checklist without translation:

```ts
interface PlanStepData {
	id: string;
	label: string;
	status: "pending" | "running" | "done" | "error" | "cancelled";
	detail?: string;
	substeps?: PlanStepData[];
}
```

Only `id`, `label`, and `status` are required. Give each step an `id` that is unique across the whole plan, substeps included: it leads the key each row is tracked by, so unique ids are what keep a row on its own DOM node when the plan changes shape. Repeats are survivable rather than fatal — the position is folded into the key — but two steps sharing an id will trade places rather than move.

## Props

| Prop           | Type                              | Default     | Description                                             |
| -------------- | --------------------------------- | ----------- | ------------------------------------------------------- |
| `steps`        | `PlanStepData[]`                  | —           | The plan, in the order it will be worked. Required.     |
| `label`        | `string`                          | `"Plan"`    | Header text, beside the done/total count                |
| `showProgress` | `boolean`                         | `true`      | Whether the thin completion bar shows                   |
| `onSelect`     | `(step: PlanStepData) => void`    | `undefined` | Called when a row is activated; turns rows into buttons |
| `item`         | `Snippet<[PlanStepData, number]>` | `undefined` | Replaces the row body, keeping the glyph and indent     |
| `class`        | `string`                          | `undefined` | Additional CSS classes                                  |
| `ref`          | `HTMLDivElement \| null`          | `null`      | Bindable reference to the root element                  |
| `sound`        | `boolean`                         | `false`     | Plays the `select` cue on row activation                |

## Counting

The count and the bar treat a substep as a step: a plan of five checks with two hiding under one of them is out of seven, not out of five. The fraction is `done / total` — only `done` counts, so a failed or cancelled step holds the bar back rather than quietly completing it.

## Depth

One level of indent is all the eye can follow at a glance, so a plan nested deeper is **flattened, not indented further**: a grandchild renders at the same level as the child it belongs to, immediately below it, keeping reading order intact. Nothing is dropped and everything is still counted.

## The current step

`aria-current="step"` lands on the **first** row whose status is `running`, in visual order. A plan with two things in flight still has one place the reader's eye — and a screen reader's "current step" — should go. Nothing carries it when nothing is running.

## Selectable rows

Pass `onSelect` and every row becomes a `<button>` with hover and focus states; leave it off and rows are plain text with nothing to tab through. A nested row reports itself, not its parent.

## Replacing a row

`item` receives the step and its position in visual order — substeps included, so the fourth line is index `3` whatever its depth:

```svelte
<AgentPlan {steps}>
	{#snippet item(step, index)}
		<span class="flex-1">{index + 1}. {step.label}</span>
	{/snippet}
</AgentPlan>
```

The glyph and the indent stay; only the text block is yours.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable                | Default (light / dark)                         | Meaning                      |
| ----------------------- | ---------------------------------------------- | ---------------------------- |
| `--ft-status-pending`   | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Queued, nothing has run yet  |
| `--ft-status-running`   | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | In flight                    |
| `--ft-status-done`      | `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` | Succeeded                    |
| `--ft-status-error`     | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | Failed                       |
| `--ft-status-cancelled` | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Abandoned before it finished |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

The `--ft-agentplan-*` names below sit in front of the shared ones, for the case where this list alone should differ:

| Variable                   | Default                        | Applies to                          |
| -------------------------- | ------------------------------ | ----------------------------------- |
| `--ft-agentplan-pending`   | `--ft-status-pending` at 70%   | Hollow ring                         |
| `--ft-agentplan-running`   | `--ft-status-running`          | Filled dot and its pulse            |
| `--ft-agentplan-done`      | `--ft-status-done`             | Tick                                |
| `--ft-agentplan-error`     | `--ft-status-error`            | Cross                               |
| `--ft-agentplan-cancelled` | `--ft-status-cancelled` at 55% | Dash                                |
| `--ft-agentplan-bar`       | `--ft-status-done`             | The progress fill                   |
| `--ft-agentplan-rail`      | `currentColor` at 16%          | The line beside a group of substeps |
| `--ft-agentplan-track-bg`  | `currentColor` at 12%          | The unfilled part of the bar        |
| `--ft-agentplan-indent`    | `1.5rem`                       | How far a substep sits in           |

## Sound

Set `sound` to play the `select` cue when a row is activated, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<AgentPlan {steps} onSelect={(step) => inspect(step)} sound />
```

It only fires from the `{#if onSelect}` button branch — a plan with no `onSelect` renders plain, inert rows and never plays anything. Every activation plays, repeats included: the component holds no "currently selected" step to compare against, so picking the same row twice is two fresh gestures, not one. Off by default; only audible once the user has separately turned sound on.

## Implementation Notes

- Status is carried by shape as well as hue — hollow ring, filled dot, tick, cross, dash — and spelled out in a screen-reader-only label beside each step, so colour is never the only signal.
- A finished step is muted, never struck through: a checklist of crossed-out lines is harder to scan, not easier.
- The list is flat in the DOM with an indent class, because `listitem` needs `list` as its parent and a wrapper per group would break that for the sake of a left margin CSS can do. The rail is drawn per row and stops on the last child of its group.
- The bar is `aria-hidden`: the header already says `4/7` in words.
- Every animation — the running pulse, the bar sliding to its new width — lives behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same states, instantly.
- Each row is keyed by its step's `id` with its flattened position appended. The id is what keeps a row on its own DOM node across a re-render; the position is what stops a model that emits the same id twice from crashing the block, and appending a step leaves every existing key untouched.
- Nothing is scheduled and no DOM is touched at construction time, so the list renders under SSR unchanged.
