# Tool Call

One tool invocation, folded into a disclosure card: a status dot, the tool name in mono, how long it took, and — once expanded — the request that went out and the result that came back.

## Components

- `ToolCall` — header button plus the payload sections it controls

## Usage

```svelte
<script>
	import { ToolCall } from "fancy-ui-svelte";

	const call = {
		id: "call_1",
		name: "search_docs",
		status: "done",
		input: { query: "retry policy", limit: 3 },
		output: { hits: 3, top: "billing/retries.md" },
		durationMs: 1400,
	};
</script>

<ToolCall {call} />
```

## The data contract

`call` is a `ToolCallData`, the shape shared by every component in this family — the same object can flow from a tool timeline into this card without translation:

```ts
interface ToolCallData {
	id: string;
	name: string;
	status: "pending" | "running" | "done" | "error" | "cancelled";
	input?: unknown;
	output?: unknown;
	error?: string;
	durationMs?: number;
}
```

Only `id`, `name`, and `status` are required. Everything else appears as it arrives: send the object with just `input` while the tool runs, then the same object with `output` and `durationMs` when it returns.

## Props

| Prop       | Type                      | Default     | Description                                        |
| ---------- | ------------------------- | ----------- | -------------------------------------------------- |
| `call`     | `ToolCallData`            | —           | The invocation to render. Required.                |
| `open`     | `boolean`                 | `undefined` | Expanded state. Bindable — see the contract below  |
| `input`    | `Snippet<[unknown]>`      | `undefined` | Replaces the default request rendering             |
| `output`   | `Snippet<[unknown]>`      | `undefined` | Replaces the default result rendering              |
| `icon`     | `Snippet`                 | `undefined` | Leading icon, replacing the default wrench         |
| `onToggle` | `(open: boolean) => void` | `undefined` | Called on every open/close, by click or on its own |
| `class`    | `string`                  | `undefined` | Additional CSS classes                             |
| `ref`      | `HTMLDivElement \| null`  | `null`      | Bindable reference to the root element             |

## The open-behaviour contract

`open` is bindable but starts life as `undefined`, which the card reads as _"nobody has decided yet, so I will"_. In that state it stays collapsed, with one exception: **a call whose status is `"error"` opens itself**, because a failure is the one payload worth reading without being asked.

The moment the reader clicks the header, the card hands over for good — a later failure will not pop it open again behind their back. Every change, whichever side caused it, is written back through `open` and announced through `onToggle`. So:

- Ignore `open` entirely and you get the automatic behaviour above.
- `bind:open={expanded}` and you get that behaviour _plus_ a variable that always reflects the truth.
- Write to `expanded` yourself and the card obeys — but that does not count as a reader toggle, so the auto-open stays armed.

## Rendering payloads

By default, objects and arrays are pretty-printed JSON in a `<pre>`; primitives render bare, so a string result reads as prose rather than as a quoted literal.

Cycles and bigints are the two things `JSON.stringify` refuses outright, and both turn up in real tool payloads — so neither costs you the payload. A self-reference prints as `"[Circular]"` and a bigint as `"9007199254740993n"`, with the rest of the object intact. Only a value that defeats even that — a `toJSON` that throws, say — falls back to `String(value)`, rather than taking the card down with it.

Pass `input` or `output` to render your own, each receiving the matching value:

```svelte
<ToolCall {call}>
	{#snippet output(value)}
		<ul>
			{#each value.hits as hit (hit.id)}
				<li>{hit.title}</li>
			{/each}
		</ul>
	{/snippet}
</ToolCall>
```

An `error` on the call is shown in the result section whatever the snippets do, tinted, above any output that still made it back.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError`. Set one of them anywhere up the tree and every component in the family follows:

| Variable                | Default (light / dark)                         | Meaning                      |
| ----------------------- | ---------------------------------------------- | ---------------------------- |
| `--ft-status-pending`   | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Queued, nothing has run yet  |
| `--ft-status-running`   | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | In flight                    |
| `--ft-status-done`      | `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` | Succeeded                    |
| `--ft-status-error`     | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | Failed                       |
| `--ft-status-cancelled` | `oklch(0.5 0.02 260)` / `oklch(0.72 0.02 260)` | Abandoned before it finished |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black — the light half is tuned for a light page and the dark half for a dark one. The greys carrying `pending` and `cancelled` are 0.5 rather than a softer 0.55 on the light side: they mostly paint dots, rings and dashes, which are graphical objects and owe 3:1 of their own, and 0.55 did not clear it.

Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Without that declaration a page resolves to the light half, which is the safe default on the white background most unthemed pages have. Overriding a `--ft-status-*` with a flat colour is fine — you then own its contrast on both themes, and `light-dark()` is available to you too.

Every colour is read at the point of use, so a value set by a consumer wins without having to out-specify the component's own scoped rules. The `--ft-toolcall-*` names below sit in front of the shared ones for the case where this card alone should differ:

| Variable                   | Default                        | Applies to                     |
| -------------------------- | ------------------------------ | ------------------------------ |
| `--ft-toolcall-pending`    | `--ft-status-pending` at 55%   | Hollow dot, pending            |
| `--ft-toolcall-running`    | `--ft-status-running`          | Dot and its pulse, running     |
| `--ft-toolcall-done`       | `--ft-status-done`             | Dot, completed                 |
| `--ft-toolcall-error`      | `--ft-status-error`            | Dot and the error line         |
| `--ft-toolcall-cancelled`  | `--ft-status-cancelled` at 40% | Hollow dot, cancelled          |
| `--ft-toolcall-payload-bg` | `currentColor` at 6%           | Background behind each `<pre>` |
| `--ft-toolcall-max-height` | `16rem`                        | Scroll cap on a long payload   |

## Implementation Notes

- Status is carried by shape as well as hue — pending and cancelled are hollow, the rest filled — and spelled out in a screen-reader-only label beside the tool name, so colour is never the only signal. A cancelled name is struck through.
- Expand/collapse is a one-row grid transitioning `grid-template-rows` between `0fr` and `1fr`, so `auto` height animates without measuring anything.
- The collapsed body is `inert`, keeping hidden payloads out of the tab order and the accessibility tree.
- Long payloads wrap rather than scroll sideways, and cap their height at `--ft-toolcall-max-height` with a vertical scrollbar.
- Every animation — the running pulse, the chevron, the expand — lives behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same states, instantly.
- Nothing is scheduled and no DOM is touched at construction time, so the card renders under SSR unchanged.
