# Recommendation Card

An agent's proposal, waiting for an answer: a kicker, the recommendation itself, how sure the agent is — counted up beside a ring that fills to match — and two buttons. Answer it and the buttons collapse into one quiet line.

## Components

- `RecommendationCard` — the whole card: header, confidence, detail region, footer

## Usage

```svelte
<script>
	import { RecommendationCard } from "fancy-ui-svelte";

	let state = $state("open");
</script>

<RecommendationCard
	badge="Suggestion"
	title="Add an index on orders.customer_id"
	description="The three slowest queries this week all scanned the whole table."
	confidence={0.87}
	bind:state
	onAccept={() => runMigration()}
/>
```

## Props

| Prop           | Type                                  | Default     | Description                                               |
| -------------- | ------------------------------------- | ----------- | --------------------------------------------------------- |
| `title`        | `string`                              | —           | What the agent is proposing. Required.                    |
| `description`  | `string`                              | `undefined` | Secondary muted line — the reasoning, the expected effect |
| `confidence`   | `number`                              | `undefined` | How sure the agent is, 0–1. Omitted, the block disappears |
| `acceptLabel`  | `string`                              | `"Apply"`   | Label for the confirm button                              |
| `dismissLabel` | `string`                              | `"Dismiss"` | Label for the decline button                              |
| `onAccept`     | `() => void`                          | `undefined` | Called on acceptance, after `state` has been written      |
| `onDismiss`    | `() => void`                          | `undefined` | Called on dismissal, after `state` has been written       |
| `state`        | `"open" \| "accepted" \| "dismissed"` | `"open"`    | Where the recommendation stands. Bindable                 |
| `badge`        | `string`                              | `undefined` | Small kicker above the title, e.g. `"Suggestion"`         |
| `children`     | `Snippet`                             | `undefined` | Detail region between the header and the footer           |
| `class`        | `string`                              | `undefined` | Additional CSS classes                                    |
| `ref`          | `HTMLDivElement \| null`              | `null`      | Bindable reference to the root element                    |

## Reading the confidence

`confidence` is a fraction, not a percentage: `0.87` renders as **87%**. The number counts up, and the ring beside it fills to the same fraction, so the figure is legible at a glance and exactly at a read.

The colour comes from three bands, borrowed from the run-status vocabulary the rest of the AI family speaks:

| Confidence | Band                  | Reads as             |
| ---------- | --------------------- | -------------------- |
| `>= 0.75`  | `--ft-status-done`    | Act on it            |
| `>= 0.5`   | `--ft-status-running` | Worth a look         |
| `< 0.5`    | `--ft-status-pending` | A guess, and says so |

Colour is never the only signal: the arc's length carries the same fraction, and the percentage is written out beside it. The counter and the ring are both `aria-hidden`, with one `role="img"` label — `"Confidence 87%"` — spoken over the pair, because a number mid-count is not worth announcing.

Omit `confidence` and the block disappears entirely rather than reading as zero. A value outside 0–1 is clamped; `NaN` and `Infinity` are treated as "not reported".

## The answer

`state` starts at `"open"` and moves once. Pressing a button writes it **before** the matching callback fires, so a consumer reading the bound value from inside its own handler already sees the answer. A card that has resolved refuses to resolve again.

Both buttons then collapse into a single line — a check and "Applied", or a cross and "Dismissed" — inside a `polite` live region that has been mounted since the first render, so the outcome is announced rather than silently swapped in. Drive `state` from outside and the card follows: setting it to `"accepted"` renders the resolved line without any callback firing.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ApprovalCard`, `ToolTimeline`, `TerminalBlock` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable              | Default (light / dark)                         | Used here for           |
| --------------------- | ---------------------------------------------- | ----------------------- |
| `--ft-status-done`    | `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` | High band, applied line |
| `--ft-status-running` | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | Middle band             |
| `--ft-status-pending` | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Low band                |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Every colour is read at the point of use, so a value set by a consumer wins without having to out-specify the component's own scoped rules. The `--ft-rec-*` names sit in front of the shared ones for the case where this card alone should differ:

| Variable             | Default               | Applies to                    |
| -------------------- | --------------------- | ----------------------------- |
| `--ft-rec-high`      | `--ft-status-done`    | Ring at 75% and above         |
| `--ft-rec-medium`    | `--ft-status-running` | Ring between 50% and 75%      |
| `--ft-rec-low`       | `--ft-status-pending` | Ring below 50%                |
| `--ft-rec-track`     | `currentColor` at 15% | The unfilled part of the ring |
| `--ft-rec-accepted`  | `--ft-status-done`    | The applied line              |
| `--ft-rec-dismissed` | `currentColor` at 65% | The dismissed line            |
| `--ft-rec-ring-size` | `1.75rem`             | Diameter of the donut         |

## Implementation Notes

- The ring is one SVG circle with a `stroke-dasharray` of its own circumference and a `stroke-dashoffset` carrying the fraction — no arc maths, no measuring. It starts empty and its target is written two animation frames later, because a transition never runs from a value the browser has not painted yet: `onMount` alone still lands inside the mounting frame, so the fill would be the first thing drawn and there would be nothing to animate between. Under reduced motion the target is written immediately instead, so there is no empty frame to notice.
- The percentage is a `NumberTicker`. Its duration is collapsed under `prefers-reduced-motion: reduce`, so the figure lands immediately instead of counting; the ring's transition sits behind `prefers-reduced-motion: no-preference` alongside it.
- The footer element is mounted from the first render and marked `aria-live="polite"`, so the region exists before the outcome lands in it — a live region that appears at the same moment as its own text is routinely missed by screen readers.
- The `state` prop is renamed on the way in (`state: current`): a binding called `state` in scope turns every `$state(...)` in the file into a store subscription. The prop is still `state` from outside.
- Nothing is scheduled and no DOM is touched at construction time, so the card renders under SSR unchanged; the ring simply arrives empty and fills on hydration.
