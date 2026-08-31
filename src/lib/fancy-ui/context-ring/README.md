# Context Ring

How much of the context window is gone, in the space of a favicon: a small donut that fills as the conversation grows, the count beside it in compact form, and — if you ask — a popover breaking the total down by what is holding it.

## Components

- `ContextRing` — the ring, its figure, and the optional breakdown popover

## Usage

```svelte
<script>
	import { ContextRing } from "fancy-ui-svelte";

	const usage = {
		used: 12_400,
		max: 200_000,
		breakdown: [
			{ label: "System prompt", tokens: 1200 },
			{ label: "Transcript", tokens: 9800 },
			{ label: "Tool results", tokens: 1400 },
		],
	};
</script>

<ContextRing {usage} expandable />
```

## The data contract

`usage` is a `TokenUsageData`, the shape shared by every component in this family — the same object can come straight off a token counter and land here without translation:

```ts
interface TokenUsageData {
	used: number;
	max: number;
	breakdown?: Array<{ label: string; tokens: number }>;
}
```

Only `used` and `max` are required. `breakdown` is what the popover lists; without it an expandable ring still opens, and says there is nothing to show.

## Props

| Prop          | Type                  | Default           | Description                                         |
| ------------- | --------------------- | ----------------- | --------------------------------------------------- |
| `usage`       | `TokenUsageData`      | —                 | Tokens used, out of how many, and of what. Required |
| `size`        | `number`              | `28`              | Outer diameter of the ring, in pixels               |
| `strokeWidth` | `number`              | `3`               | Thickness of the track and the arc, in pixels       |
| `showLabel`   | `boolean`             | `true`            | Whether the compact figure is shown beside the ring |
| `warnAt`      | `number`              | `0.75`            | Fraction at which the ring leaves the quiet band    |
| `criticalAt`  | `number`              | `0.9`             | Fraction at which the ring turns to the error hue   |
| `label`       | `string`              | `"Context usage"` | Accessible name for the meter                       |
| `expandable`  | `boolean`             | `false`           | Whether clicking opens the breakdown popover        |
| `class`       | `string`              | `undefined`       | Additional CSS classes                              |
| `ref`         | `HTMLElement \| null` | `null`            | Bindable reference to the root element              |
| `sound`       | `boolean`             | `false`           | Plays `open`/`close` on the breakdown popover       |

## Sound

Set `sound` to opt into interface cues, off by default and silent until the user has enabled sound in their own preferences (see [`sound/README.md`](../sound/README.md)):

```svelte
<ContextRing {usage} expandable sound />
```

`open` plays when the breakdown popover opens from the trigger; `close` plays exactly once whichever way it is dismissed — the trigger toggling it shut, Escape, or a press outside. `sound` has nothing to do while `expandable` is false: there is no popover to toggle. Taking `expandable` away closes the popover as a direct write, silently — that path is bookkeeping, not a dismissal the reader triggered.

## Reading the ring

The arc carries `used / max`, clamped to 0–1: a conversation that has run past its budget shows a closed ring rather than a second lap. A `max` of zero — or of nothing sensible at all — draws an empty ring instead of dividing by it.

Colour comes from three bands, borrowed from the run-status vocabulary the rest of the AI family speaks, so the ring introduces no palette of its own:

| Fraction                | Band       | Token                 | Reads as                |
| ----------------------- | ---------- | --------------------- | ----------------------- |
| `< warnAt`              | `ok`       | `--ft-status-pending` | Plenty of room          |
| `warnAt` … `criticalAt` | `warn`     | `--ft-status-running` | Worth keeping an eye on |
| `>= criticalAt`         | `critical` | `--ft-status-error`   | About to run out        |

The band is on the root as `data-band`, so a consumer can key their own chrome off the same three words. Colour is never the only signal: the arc's length carries the fraction, and the figure beside it says the count.

Set `criticalAt` below `warnAt` and it is floored at `warnAt` rather than obeyed — a critical threshold under the warning is a band that can never win, and a ring that escalates in one direction is more useful than one that escalates in none.

## The figure

`showLabel` renders a compact reading beside the ring — `12.4k / 200k`. The formatter is deliberately not `Intl.NumberFormat`'s compact notation, which rounds `12,400` to `12K` and drops exactly the digit a reader watches:

| Tokens    | Renders as | Rule                              |
| --------- | ---------- | --------------------------------- |
| `850`     | `850`      | Under a thousand, counted exactly |
| `1000`    | `1k`       | No hanging `.0`                   |
| `12,400`  | `12.4k`    | One decimal under 100k            |
| `154,000` | `154k`     | Rounded above 100k                |

The figure is `aria-hidden`. The whole readout is one `role="meter"` whose `aria-valuetext` spells the counts out in full — `"12,400 of 200,000 tokens"` — because a compact figure is a glance, not a reading. `aria-valuenow` is pinned at `aria-valuemax` when the conversation is over budget, since a meter's value may not exceed its maximum; the `aria-valuetext` still reports the real number.

## The breakdown

`expandable` turns the ring into a button that toggles a popover listing each `breakdown` row with its own compact count. It closes on Escape — returning focus to the ring — on a click outside, and on a second press of the ring itself.

The button takes its accessible name from the meter it contains, so the single string passed as `label` names both and the two cannot drift apart. Rows are keyed on their label _and_ their index, because a model will happily report two rows called "Tool results" and a key that is only the label would make the second replace the first.

The popover is positioned with the shared float helper (`bottom-end`, re-measured on scroll and resize) and is only in the DOM while it is open, so an idle ring adds nothing for a screen reader to step over.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `RecommendationCard`, `TerminalBlock` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable              | Default (light / dark)                         | Used here for   |
| --------------------- | ---------------------------------------------- | --------------- |
| `--ft-status-pending` | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | `ok` band       |
| `--ft-status-running` | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | `warn` band     |
| `--ft-status-error`   | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | `critical` band |

Each default is a `light-dark()` pair, because no single token clears the contrast it owes against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Every colour is read at the point of use, so a value set by a consumer wins without having to out-specify the component's own scoped rules. The `--ft-ctxring-*` names sit in front of the shared ones for the case where this ring alone should differ:

| Variable                    | Default                      | Applies to                        |
| --------------------------- | ---------------------------- | --------------------------------- |
| `--ft-ctxring-ok`           | `--ft-status-pending`        | Arc below `warnAt`                |
| `--ft-ctxring-warn`         | `--ft-status-running`        | Arc between the thresholds        |
| `--ft-ctxring-critical`     | `--ft-status-error`          | Arc at `criticalAt` and above     |
| `--ft-ctxring-track`        | `currentColor` at 15%        | The unfilled part of the ring     |
| `--ft-ctxring-panel-bg`     | `--color-popover`            | Breakdown popover surface         |
| `--ft-ctxring-panel-fg`     | `--color-popover-foreground` | Breakdown popover text            |
| `--ft-ctxring-panel-border` | `--color-border`             | Breakdown popover border          |
| `--ft-ctxring-panel-width`  | `14rem`                      | Breakdown popover width           |
| `--ft-ctxring-row-value`    | `currentColor` at 70%        | Per-row counts and the empty line |

Geometry is props rather than variables: `size` and `strokeWidth` feed the `viewBox`, the radius and the dash array together, so they cannot be set half-way from CSS.

## Implementation Notes

- The arc is one SVG circle with a `stroke-dasharray` of its own circumference and a `stroke-dashoffset` carrying the fraction — no arc maths, no measuring. The stroke is inset by half its own width so a thick ring stays inside its box, and is clamped to the radius so it can never eat its own centre.
- It starts empty and its target is written two animation frames later, because a transition never runs from a value the browser has not painted yet: `onMount` alone still lands inside the mounting frame, so the fill would be the first thing drawn and there would be nothing to animate between. Under reduced motion the target is written immediately instead, so there is no empty frame to notice.
- Everything the meter _means_ — its value, its text, its band, the compact figure — is derived from the props alone, so a server render is exact and mount-independent. Only the entrance sweep waits for the client.
- Both moving parts live behind `prefers-reduced-motion: no-preference`: the arc's `stroke-dashoffset` and colour transition, and the popover's entrance. Reduced motion gets the same states, instantly.
- Nothing is scheduled and no DOM is touched at construction time, so the ring renders under SSR unchanged.
