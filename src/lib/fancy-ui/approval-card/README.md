# Approval Card

A human-in-the-loop gate: the agent states what it is about to do, and nothing happens until someone presses a button. Once pressed, the footer collapses to a one-line verdict that stays on screen as the record of who let it through.

## Components

- `ApprovalCard` — the gate: header, optional detail region, and a footer that swaps buttons for a verdict

## Usage

```svelte
<script>
	import { ApprovalCard } from "fancy-ui-svelte";

	let state = $state("pending");
</script>

<ApprovalCard
	title="Run database migration"
	description="Adds two columns to `invoices` and backfills 41,880 rows."
	bind:state
	onApprove={() => runMigration()}
	onDeny={() => tellTheAgentNo()}
/>
```

## Props

| Prop           | Type                                  | Default     | Description                                                         |
| -------------- | ------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `title`        | `string`                              | —           | What permission is being asked for. Required.                       |
| `description`  | `string`                              | `undefined` | Muted second line — the consequence, the blast radius               |
| `state`        | `"pending" \| "approved" \| "denied"` | `"pending"` | Which side of the gate we are on. Bindable                          |
| `destructive`  | `boolean`                             | `false`     | Irreversible: red approve button, warning tint, alert on the shield |
| `approveLabel` | `string`                              | `"Approve"` | Label for the approve button                                        |
| `denyLabel`    | `string`                              | `"Deny"`    | Label for the deny button                                           |
| `onApprove`    | `() => void`                          | `undefined` | Called on approve, after `state` has been written                   |
| `onDeny`       | `() => void`                          | `undefined` | Called on deny, after `state` has been written                      |
| `busy`         | `boolean`                             | `false`     | The consumer is executing: both buttons disabled, card `aria-busy`  |
| `children`     | `Snippet`                             | `undefined` | Detail region between header and footer                             |
| `class`        | `string`                              | `undefined` | Additional CSS classes                                              |
| `ref`          | `HTMLDivElement \| null`              | `null`      | Bindable reference to the root element                              |

## The decision contract

A gate resolves once. `state` starts at `"pending"`, the only state in which the buttons exist at all; pressing one writes the answer to `state` **before** the matching callback fires, so a consumer reading the bound value from inside its own handler already sees it. A second press cannot happen — the buttons are gone — and a decision arriving while `busy` is refused outright.

`state` is bindable in both directions. Write `"approved"` to it yourself and the card resolves with no callback fired, which is how you restore a gate that was already answered in a previous session. Write `"pending"` back and the buttons return.

`busy` covers the gap between the press and the work finishing:

```svelte
<ApprovalCard
	title="Deploy to production"
	bind:state
	{busy}
	onApprove={async () => {
		busy = true;
		await deploy();
		busy = false;
	}}
/>
```

Because the buttons vanish on the press, `busy` mostly matters for the case where the decision is driven from outside — an optimistic `state` write that has not been confirmed yet still marks the card `aria-busy`, which is what a screen reader needs to know that something is in flight.

## The detail region

`children` renders between the description and the footer, which is where the evidence goes — a command about to be run, a diff about to be applied, a payload about to be posted:

```svelte
<ApprovalCard title="Publish release" destructive>
	<pre class="rounded bg-black/5 px-2 py-1 font-mono text-xs">npm publish --access public</pre>
</ApprovalCard>
```

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable            | Default (light / dark)                         | Used for                  |
| ------------------- | ---------------------------------------------- | ------------------------- |
| `--ft-status-error` | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | The destructive treatment |
| `--ft-status-done`  | `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` | The approved verdict line |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Every colour is read at the point of use, so a value you set wins without having to out-specify the component's own scoped rules. The `--ft-approval-*` names sit in front of the shared ones for the case where this card alone should differ:

| Variable                      | Default                    | Applies to                           |
| ----------------------------- | -------------------------- | ------------------------------------ |
| `--ft-approval-danger`        | `--ft-status-error`        | Destructive button, shield, and tint |
| `--ft-approval-danger-fg`     | White / near-black pair    | Text on the destructive button       |
| `--ft-approval-danger-bg`     | `--ft-approval-danger` 6%  | Card tint when destructive           |
| `--ft-approval-danger-border` | `--ft-approval-danger` 22% | Card border when destructive         |
| `--ft-approval-approved`      | `--ft-status-done`         | The "Approved" line                  |
| `--ft-approval-denied`        | `currentColor` at 65%      | The "Denied" line                    |

## Implementation Notes

- The buttons exist only while `state` is `"pending"`, so a resolved gate leaves nothing focusable behind — no disabled button lingering in the tab order for someone to wonder about.
- The footer is one element mounted from the first render, carrying `aria-live="polite"`. A live region that appears at the same moment as its own text is routinely missed by screen readers; this one is already listening when the verdict lands in it.
- `destructive` is never carried by colour alone: the shield gains an alert mark alongside the red, so the warning survives a monochrome rendering.
- The destructive button's text flips with `color-scheme`, because the same red is dark on a light page (white text, 6.8:1) and light on a dark one (near-black text, 5.7:1).
- The swap from the button row to the verdict is carried by the verdict's own fade-in, not by an animated height: the footer's height is `auto` before and after, and a transition needs the specified value to change. Nothing is measured and no layout is read back.
- That fade lives behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same states, the same colours, and the same words, immediately.
- Nothing is scheduled and no DOM is touched at construction time, so the card renders under SSR unchanged.
